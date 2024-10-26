import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import {
  SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID,
  SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME,
  WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
} from '../../../../../lib/consts';
import { CONTENT_PRODUCER_ID_NONE } from '../../../../../lib/content';
import type {
  WebHostingClauseCloudfrontS3,
  WebHostingDefaultsClauseCloudfrontS3,
} from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import { _somMeta } from '../../../../../lib/utils';
import type { SiteResourcesStack } from '../SiteStack/SiteResourcesStack';
import type { CertificateResources } from './CertificateBuilder';
import type { CloudfrontFunctionsResources } from './CloudfrontFunctionsBuilder';
import * as CloudfrontFunctionsBuilder from './CloudfrontFunctionsBuilder';
import * as CloudfrontFunctionsLoader from './CloudfrontFunctionsLoader';
import * as ResponseHeadersBuilder from './ResponseHeadersBuilder';
import { S3OriginWithOACPatch } from './S3OriginWithOACPatchProps';
import * as SiteContentLoader from './SiteContentLoader';
import type { WafResources } from './WafBuilder';

// ----------------------------------------------------------------------
export type S3CloudfrontDistributionResources = {
  readonly cloudfrontFunctionsResources: CloudfrontFunctionsResources;
  readonly cloudfrontDistribution: cloudfront.Distribution;
  readonly dnsRecords: Array<route53.RecordSet>;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(
  siteResourcesStack: SiteResourcesStack,
  webHostingSpec: WebHostingClauseCloudfrontS3,
  webHostingDefaults: WebHostingDefaultsClauseCloudfrontS3,
  certificateResources: CertificateResources,
  wafResources: WafResources
): Promise<S3CloudfrontDistributionResources> {
  if (!siteResourcesStack.hostedZoneResources?.hostedZone) {
    throw new Error('[site-o-matic] Could not build S3 Cloudfront distribution resources when hostedZone is missing');
  }
  if (!siteResourcesStack.domainBucketResources?.domainBucket) {
    throw new Error('[site-o-matic] Could not build S3 Cloudfront distribution resources when domainBucket is missing');
  }
  if (!siteResourcesStack.domainPublisherResources?.domainPublisher) {
    throw new Error(
      '[site-o-matic] Could not build S3 Cloudfront distribution resources when domainPublisher is missing'
    );
  }

  // ----------------------------------------------------------------------
  // Build cloudfront functions
  const cloudfrontFunctionsDeps = await CloudfrontFunctionsLoader.load(siteResourcesStack, webHostingSpec);
  const cloudfrontFunctionsResources = await CloudfrontFunctionsBuilder.build(
    siteResourcesStack,
    [WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID, cloudfrontFunctionsDeps.cfFunctionViewerRequestTmpFilePath],
    [WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID, cloudfrontFunctionsDeps.cfFunctionViewerResponseTmpFilePath]
  );

  // ----------------------------------------------------------------------
  // XXX: Remove when there is first-class CDK support
  const s3OriginWithOacPatch = new S3OriginWithOACPatch(siteResourcesStack.domainBucketResources.domainBucket, {
    oacId: siteResourcesStack.domainBucketResources.originAccessControl.getAtt('Id'),
    originPath: webHostingSpec.originPath ?? webHostingDefaults.originPath,
    originShieldEnabled: false,
  });

  // ----------------------------------------------------------------------
  // Response headers policy
  const responseHeadersResources = await ResponseHeadersBuilder.build(siteResourcesStack);

  // ----------------------------------------------------------------------
  // Cloudfront distribution
  const cloudfrontDistribution = new cloudfront.Distribution(
    siteResourcesStack,
    'CloudFrontDistribution',
    Object.assign(
      {
        defaultBehavior: Object.assign(
          {
            origin: s3OriginWithOacPatch,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: new cloudfront.CachePolicy(siteResourcesStack, 'CloudFrontDistributionCachePolicy', {
              queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
              cookieBehavior: cloudfront.CacheCookieBehavior.none(),
              enableAcceptEncodingBrotli: true,
              enableAcceptEncodingGzip: true,
            }),
            originRequestPolicy: new cloudfront.OriginRequestPolicy(siteResourcesStack, 'OriginRequestPolicy', {
              queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
              cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
            }),
            compress: true,
          },
          cloudfrontFunctionsResources.functions.length > 0
            ? {
                functionAssociations: cloudfrontFunctionsResources.functions.map(
                  ([cfFunction, cfFunctionEventType]) => ({
                    function: cfFunction,
                    eventType: cfFunctionEventType,
                  })
                ),
              }
            : {}
        ),
        domainNames: [webHostingSpec.domainName],
        certificate: certificateResources.certificate,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        defaultRootObject: webHostingSpec.defaultRootObject ?? webHostingDefaults.defaultRootObject,
        enableIpv6: true,
        responseHeadersPolicy: responseHeadersResources.responseHeadersPolicy,
        errorResponses: webHostingSpec.errorResponses ?? webHostingDefaults.errorResponses,
      },
      wafResources.wafEnabled && wafResources.wafAcl ? { webAclId: wafResources.wafAcl.attrArn } : {}
    )
  );
  _somMeta(
    siteResourcesStack.siteProps.config,
    cloudfrontDistribution,
    siteResourcesStack.somId,
    siteResourcesStack.siteProps.locked
  );

  // ----------------------------------------------------------------------
  // Stitch together OAC
  siteResourcesStack.domainBucketResources.domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      sid: 'AllowCloudFrontServicePrincipal',
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com') as never],
      resources: [siteResourcesStack.domainBucketResources.domainBucket.arnForObjects('*')],
      conditions: {
        StringEquals: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'AWS:SourceArn': `arn:aws:cloudfront::${siteResourcesStack.account}:distribution/${cloudfrontDistribution.distributionId}`,
        },
      },
    })
  );

  // ----------------------------------------------------------------------
  // DNS records
  const dns1 = new route53.ARecord(siteResourcesStack, 'DnsRecordSet_A', {
    zone: siteResourcesStack.hostedZoneResources.hostedZone,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudfrontDistribution)),
  });
  _somMeta(siteResourcesStack.siteProps.config, dns1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const dns2 = new route53.AaaaRecord(siteResourcesStack, 'DnsRecordSet_AAAA', {
    zone: siteResourcesStack.hostedZoneResources.hostedZone,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudfrontDistribution)),
  });
  _somMeta(siteResourcesStack.siteProps.config, dns2, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  // ----------------------------------------------------------------------
  // Domain Publisher permissions
  siteResourcesStack.domainPublisherResources.domainPublisherPolicy.addStatements(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [
        `arn:aws:cloudfront::${siteResourcesStack.siteProps.env.accountId}:distribution/${cloudfrontDistribution.distributionId}`,
      ],
      actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation', 'cloudfront:ListInvalidations'],
    })
  );

  // ----------------------------------------------------------------------
  // Add automatically generated content to the bucket if it is empty, and if so configured
  if (
    siteResourcesStack.siteProps.facts.shouldDeployS3Content &&
    webHostingSpec.content?.producerId !== CONTENT_PRODUCER_ID_NONE
  ) {
    const siteContentDeps = await SiteContentLoader.load(siteResourcesStack, webHostingSpec);
    if (siteContentDeps.siteContentTmpDirPath) {
      new s3Deployment.BucketDeployment(siteResourcesStack, 'S3BucketContentDeployment', {
        sources: [s3Deployment.Source.asset(siteContentDeps.siteContentTmpDirPath)],
        destinationBucket: siteResourcesStack.domainBucketResources.domainBucket,
      });
    }
  }

  // ----------------------------------------------------------------------
  // SSM Params
  const ssm1 = new ssm.StringParameter(siteResourcesStack, 'SsmCloudfrontDistributionId', {
    parameterName: toSsmParamName(siteResourcesStack.somId, SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID, 'www'),
    stringValue: cloudfrontDistribution.distributionId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, ssm1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const ssm2 = new ssm.StringParameter(siteResourcesStack, 'SsmCloudfrontDomainName', {
    parameterName: toSsmParamName(siteResourcesStack.somId, SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME, 'www'),
    stringValue: cloudfrontDistribution.distributionDomainName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, ssm2, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  return {
    cloudfrontDistribution,
    cloudfrontFunctionsResources,
    dnsRecords: [dns1, dns2],
    ssmParams: [ssm1, ssm2],
  };
}
