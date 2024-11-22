import { CloudfrontDistribution } from '@cdktf/provider-aws/lib/cloudfront-distribution';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { Route53Record } from '@cdktf/provider-aws/lib/route53-record';
import { SsmParameter } from '@cdktf/provider-aws/lib/ssm-parameter';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import {
  SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID,
  SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME,
  WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
} from '../../../../../lib/consts';
import type {
  WebHostingClauseCloudfrontHttps,
  WebHostingDefaultsClauseCloudfrontHttps,
} from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { SecretsSetCollection } from '../../../../../lib/secrets/types';
import { _somTags, fqdn } from '../../../../../lib/utils';
import type { SiteStack } from '../SiteStack';
import type { CertificateResources } from './CertificateBuilder';
import type { CloudfrontFunctionsResources } from './CloudfrontFunctionsBuilder';
import * as CloudfrontFunctionsBuilder from './CloudfrontFunctionsBuilder';
import * as CloudfrontFunctionsLoader from './CloudfrontFunctionsLoader';
import * as CloudfrontSubResourcesBuilder from './CloudfrontSubResourcesBuilder';
import * as WafBuilder from './WafBuilder';

// ----------------------------------------------------------------------
export type HttpsCloudfrontDistributionResources = {
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
  webHostingSpec: WebHostingClauseCloudfrontHttps,
  _webHostingDefaults: WebHostingDefaultsClauseCloudfrontHttps,
  localIdPostfix: string,
  certificateResources: CertificateResources
): Promise<HttpsCloudfrontDistributionResources> {
  if (!siteStack.hostedZoneResources?.hostedZone) {
    throw new Error(
      '[site-o-matic] Could not build HTTPS Cloudfront distribution resources when hostedZone is missing'
    );
  }
  if (!siteStack.domainUserResources?.domainUser) {
    throw new Error(
      '[site-o-matic] Could not build HTTPS Cloudfront distribution resources when domainUser is missing'
    );
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
        origin: [
          {
            originId: `originId-${localIdPostfix}`,
            domainName: webHostingSpec.url,
            originShield: {
              enabled: false,
              originShieldRegion: siteStack.siteProps.context.manifest.region,
            },
          },
        ],
        restrictions: {
          geoRestriction: {
            restrictionType: 'none',
          },
        },
        viewerCertificate: {
          acmCertificateArn: certificateResources.certificate.arn,
          sslSupportMethod: 'sni-only',
        },
        defaultCacheBehavior: Object.assign(
          {
            targetOriginId: `originId-${localIdPostfix}`,
            allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
            cachedMethods: [],
            viewerProtocolPolicy: 'redirect-to-https',
            responseHeadersPolicyId: cloudfrontSubResources.responseHeadersPolicy.id,
            cachePolicyId: cloudfrontSubResources.cachePolicy.id,
            originRequestPolicy: cloudfrontSubResources.originRequestPolicyHttps,
            compress: true,
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
      },
      wafResources.wafEnabled && wafResources.wafAcl ? { webAclId: wafResources.wafAcl.arn } : {},
      {
        provider: siteStack.providerManifestRegion,
        tags: _somTags(siteStack),
      }
    )
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
    provider: siteStack.providerCertificateRegion,
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
    provider: siteStack.providerCertificateRegion,
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
