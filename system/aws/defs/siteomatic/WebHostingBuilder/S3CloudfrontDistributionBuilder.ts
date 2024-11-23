import * as path from 'node:path';

import type { CloudfrontDistributionCustomErrorResponse } from '@cdktf/provider-aws/lib/cloudfront-distribution';
import { CloudfrontDistribution } from '@cdktf/provider-aws/lib/cloudfront-distribution';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { Route53Record } from '@cdktf/provider-aws/lib/route53-record';
import { SsmParameter } from '@cdktf/provider-aws/lib/ssm-parameter';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import { awsCliS3CpDirectory } from '../../../../../lib/awsCliExec';
import {
  SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID,
  SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME,
  SSM_PARAM_NAME_DOMAIN_BUCKET_NAME,
  WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
} from '../../../../../lib/consts';
import { CONTENT_PRODUCER_ID_NONE } from '../../../../../lib/content';
import type {
  WebHostingClauseCloudfrontS3,
  WebHostingDefaultsClauseCloudfrontS3,
} from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { SecretsSetCollection } from '../../../../../lib/secrets/types';
import { _somTags, fqdn, getContextParam } from '../../../../../lib/utils';
import type { SiteStack } from '../SiteStack';
import type { CertificateResources } from './CertificateBuilder';
import type { CloudfrontFunctionsResources } from './CloudfrontFunctionsBuilder';
import * as CloudfrontFunctionsBuilder from './CloudfrontFunctionsBuilder';
import * as CloudfrontFunctionsLoader from './CloudfrontFunctionsLoader';
import * as CloudfrontSubResourcesBuilder from './CloudfrontSubResourcesBuilder';
import * as SiteContentLoader from './SiteContentLoader';
import * as WafBuilder from './WafBuilder';

// ----------------------------------------------------------------------
export type S3CloudfrontDistributionResources = {
  readonly cloudfrontDistribution: CloudfrontDistribution;
  readonly cloudfrontFunctionsResources: CloudfrontFunctionsResources;
  readonly wafResources: WafBuilder.WafResources;
  readonly dnsRecords: Array<Route53Record>;
  readonly ssmParams: Array<SsmParameter>;
};

// ----------------------------------------------------------------------
export async function build(
  siteStack: SiteStack,
  secrets: SecretsSetCollection,
  webHostingSpec: WebHostingClauseCloudfrontS3,
  webHostingDefaults: WebHostingDefaultsClauseCloudfrontS3,
  localIdPostfix: string,
  certificateResources: CertificateResources
): Promise<S3CloudfrontDistributionResources> {
  if (!siteStack.hostedZoneResources?.hostedZone) {
    throw new Error('[site-o-matic] Could not build S3 Cloudfront distribution resources when hostedZone is missing');
  }
  if (!siteStack.domainBucketResources?.domainBucket) {
    throw new Error('[site-o-matic] Could not build S3 Cloudfront distribution resources when domainBucket is missing');
  }
  if (!siteStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build S3 Cloudfront distribution resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  // Build cloudfront functions
  const cloudfrontFunctionsDeps = await CloudfrontFunctionsLoader.load(siteStack, secrets, webHostingSpec);
  const cloudfrontFunctionsResources = await CloudfrontFunctionsBuilder.build(
    siteStack,
    webHostingSpec,
    localIdPostfix,
    [WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID, cloudfrontFunctionsDeps.cfFunctionViewerRequestTmpFilePath],
    [WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID, cloudfrontFunctionsDeps.cfFunctionViewerResponseTmpFilePath]
  );

  // ----------------------------------------------------------------------
  // WAF ACl
  const wafResources = await WafBuilder.build(siteStack, webHostingSpec, localIdPostfix);

  // ----------------------------------------------------------------------
  // Sub-resources
  const cloudfrontSubResources = await CloudfrontSubResourcesBuilder.build(siteStack, localIdPostfix);

  const customErrorResponse: Array<CloudfrontDistributionCustomErrorResponse> = (
    webHostingSpec.errorResponses ?? webHostingDefaults.errorResponses
  ).map((x) => ({
    errorCode: x.httpStatus,
    responseCode: x.responseHttpStatus ?? x.httpStatus,
    responsePagePath: x.responsePagePath,
    ttl: x.ttl,
  }));

  // ----------------------------------------------------------------------
  // Cloudfront distribution
  const cloudfrontDistribution = new CloudfrontDistribution(
    siteStack,
    `CloudFrontDistribution-${localIdPostfix}`,
    Object.assign(
      {
        enabled: true,
        isIpv6Enabled: true,
        priceClass: 'PriceClass_100',
        comment: webHostingSpec.domainName,
        domainNames: [webHostingSpec.domainName],
        aliases: [webHostingSpec.domainName],
        defaultRootObject: webHostingSpec.defaultRootObject ?? webHostingDefaults.defaultRootObject,
        customErrorResponse,
        origin: [
          {
            originId: siteStack.domainBucketResources.domainBucket.id,
            domainName: siteStack.domainBucketResources.domainBucket.bucketDomainName,
            originAccessControlId: siteStack.domainBucketResources.originAccessControl.id,
            originPath: webHostingSpec.originPath ?? webHostingDefaults.originPath,
            /*[XXX: causes diff every time?]
            originShield: {
              enabled: false,
              originShieldRegion: siteStack.siteProps.context.manifest.region,
            },
            */
          },
        ],
        defaultCacheBehavior: Object.assign(
          {
            targetOriginId: siteStack.domainBucketResources.domainBucket.id,
            allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
            cachedMethods: ['GET', 'HEAD', 'OPTIONS'],
            viewerProtocolPolicy: 'redirect-to-https',
            responseHeadersPolicyId: cloudfrontSubResources.responseHeadersPolicy.id,
            cachePolicyId: cloudfrontSubResources.cachePolicy.id,
            originRequestPolicy: cloudfrontSubResources.originRequestPolicyS3,
            compress: true,
            minTtl: 0,
            defaultTtl: 0,
            maxTtl: 0,
          },
          cloudfrontFunctionsResources.functions.length > 0
            ? {
                functionAssociation: cloudfrontFunctionsResources.functions.map(
                  ([cfFunction, cfFunctionEventType]) => ({
                    functionArn: cfFunction.arn,
                    eventType: cfFunctionEventType,
                  })
                ),
              }
            : {}
        ),
        restrictions: {
          geoRestriction: {
            restrictionType: 'none',
          },
        },
        viewerCertificate: {
          acmCertificateArn: certificateResources.certificate.arn,
          sslSupportMethod: 'sni-only',
          minimumProtocolVersion: 'TLSv1.2_2021',
        },
      },
      wafResources.wafEnabled && wafResources.wafAcl ? { webAclId: wafResources.wafAcl.arn } : {},
      {
        provider: siteStack.providerManifestRegion,
        tags: _somTags(siteStack),
      }
    )
  );

  // ----------------------------------------------------------------------
  // Permissions
  siteStack.domainBucketPolicyDocuments.push(
    new DataAwsIamPolicyDocument(siteStack, `s3BucketCloudfrontAccessPolicyDocument-${localIdPostfix}`, {
      statement: [
        {
          effect: 'Allow',
          actions: ['s3:GetObject'],
          principals: [
            {
              identifiers: ['cloudfront.amazonaws.com'],
              type: 'Service',
            },
          ],
          resources: [`${siteStack.domainBucketResources.domainBucket.arn}/*`],
          condition: [
            {
              test: 'StringEquals',
              variable: 'AWS:SourceArn',
              values: [cloudfrontDistribution.arn],
            },
          ],
        },
      ],
      provider: siteStack.providerManifestRegion,
    })
  );

  // ----------------------------------------------------------------------
  // DNS records
  const dns1 = new Route53Record(siteStack, `DnsRecordSet_A-${localIdPostfix}`, {
    type: 'A',
    zoneId: siteStack.hostedZoneResources.hostedZone.zoneId,
    name: fqdn(webHostingSpec.domainName),
    alias: {
      name: cloudfrontDistribution.domainName,
      zoneId: cloudfrontDistribution.hostedZoneId,
      evaluateTargetHealth: false,
    },
    provider: siteStack.providerManifestRegion,
  });

  const dns2 = new Route53Record(siteStack, `DnsRecordSet_AAAA-${localIdPostfix}`, {
    type: 'AAAA',
    zoneId: siteStack.hostedZoneResources.hostedZone.zoneId,
    name: fqdn(webHostingSpec.domainName),
    alias: {
      name: cloudfrontDistribution.domainName,
      zoneId: cloudfrontDistribution.hostedZoneId,
      evaluateTargetHealth: false,
    },
    provider: siteStack.providerManifestRegion,
  });

  // ----------------------------------------------------------------------
  // Domain user permissions
  siteStack.domainUserPolicyDocuments.push(
    new DataAwsIamPolicyDocument(siteStack, `cloudFrontPolicyDocument-${localIdPostfix}`, {
      statement: [
        {
          effect: 'Allow',
          actions: ['cloudfront:CreateInvalidation'],
          resources: [cloudfrontDistribution.arn],
        },
      ],
    })
  );

  // ----------------------------------------------------------------------
  // Add automatically generated content to the bucket if it is empty, and if so configured
  if (
    siteStack.siteProps.facts.shouldDeployS3Content &&
    webHostingSpec.content?.producerId !== CONTENT_PRODUCER_ID_NONE
  ) {
    const siteContentDeps = await SiteContentLoader.load(siteStack, webHostingSpec);
    if (siteContentDeps.siteContentTmpDirPath) {
      await awsCliS3CpDirectory(
        `${siteContentDeps.siteContentTmpDirPath}/*`,
        `s3://${getContextParam(siteStack.siteProps.context, SSM_PARAM_NAME_DOMAIN_BUCKET_NAME)}/${path.relative('/', webHostingSpec.originPath ?? webHostingDefaults.originPath)}`
      );
    }
  }

  // ----------------------------------------------------------------------
  // SSM Params
  const ssm1 = new SsmParameter(siteStack, `SsmCloudfrontDistributionId-${localIdPostfix}`, {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID,
      webHostingSpec.domainName
    ),
    value: cloudfrontDistribution.id,
    provider: siteStack.providerControlPlaneRegion,
    tags: _somTags(siteStack),
  });

  const ssm2 = new SsmParameter(siteStack, `SsmCloudfrontDomainName-${localIdPostfix}`, {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME,
      webHostingSpec.domainName
    ),
    value: cloudfrontDistribution.domainName,
    provider: siteStack.providerControlPlaneRegion,
    tags: _somTags(siteStack),
  });

  console.log(`Generated Cloudfront distribution for ${webHostingSpec.domainName}`);

  return {
    cloudfrontDistribution,
    cloudfrontFunctionsResources,
    wafResources,
    dnsRecords: [dns1, dns2],
    ssmParams: [ssm1, ssm2],
  };
}
