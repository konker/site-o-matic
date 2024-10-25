import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as ssm from 'aws-cdk-lib/aws-ssm';

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
import { _somMeta } from '../../../../../lib/utils';
import type { SiteResourcesStack } from '../SiteStack/SiteResourcesStack';
import type { CertificateResources } from './CertificateBuilder';
import type { CloudfrontFunctionsResources } from './CloudfrontFunctionsBuilder';
import * as CloudfrontFunctionsBuilder from './CloudfrontFunctionsBuilder';
import * as CloudfrontFunctionsLoader from './CloudfrontFunctionsLoader';
import { ExistingRestApiOrigin } from './ExistingRestApiOrigin';
import type { WafResources } from './WafBuilder';

// ----------------------------------------------------------------------
export type HttpsCloudfrontDistributionResources = {
  readonly cloudfrontFunctionsResources: CloudfrontFunctionsResources;
  cloudfrontDistribution: cloudfront.Distribution;
  dnsRecords: Array<route53.RecordSet>;
  ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(
  siteResourcesStack: SiteResourcesStack,
  webHostingSpec: WebHostingClauseCloudfrontHttps,
  _webHostingDefaults: WebHostingDefaultsClauseCloudfrontHttps,
  certificateResources: CertificateResources,
  _wafResources: WafResources
): Promise<HttpsCloudfrontDistributionResources> {
  if (!siteResourcesStack.hostedZoneResources?.hostedZone) {
    throw new Error(
      '[site-o-matic] Could not build https Cloudfront distribution resources when hostedZone is missing'
    );
  }
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error(
      '[site-o-matic] Could not build https Cloudfront distribution resources when domainUser is missing'
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
  // Origin access identity which will be used by the cloudfront distribution
  const originAccessIdentity = new cloudfront.OriginAccessIdentity(siteResourcesStack, 'OriginAccessIdentity', {
    comment: `OriginAccessIdentity for ${webHostingSpec.domainName}`,
  });
  _somMeta(
    siteResourcesStack.siteProps.config,
    originAccessIdentity,
    siteResourcesStack.somId,
    siteResourcesStack.siteProps.locked
  );

  // ----------------------------------------------------------------------
  // Origin
  const origin = new ExistingRestApiOrigin(webHostingSpec.url);

  // ----------------------------------------------------------------------
  // Cloudfront distribution
  const cloudfrontDistribution = new cloudfront.Distribution(
    siteResourcesStack,
    `CloudFrontDistribution-${webHostingSpec.domainName}`,
    {
      defaultBehavior: Object.assign(
        {
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          compress: true,
        },
        cloudfrontFunctionsResources.functions.length > 0
          ? {
              functionAssociations: cloudfrontFunctionsResources.functions.map(([cfFunction, cfFunctionEventType]) => ({
                function: cfFunction,
                eventType: cfFunctionEventType,
              })),
            }
          : {}
      ),
      domainNames: [webHostingSpec.domainName],
      certificate: certificateResources.certificate,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
    }
  );
  _somMeta(
    siteResourcesStack.siteProps.config,
    cloudfrontDistribution,
    siteResourcesStack.somId,
    siteResourcesStack.siteProps.locked
  );

  // ----------------------------------------------------------------------
  // DNS records
  const dns1 = new route53.ARecord(siteResourcesStack, 'DnsRecordSet_A', {
    zone: siteResourcesStack.hostedZoneResources.hostedZone,
    recordName: webHostingSpec.domainName,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudfrontDistribution)),
  });
  _somMeta(siteResourcesStack.siteProps.config, dns1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const dns2 = new route53.AaaaRecord(siteResourcesStack, 'DnsRecordSet_AAAA', {
    zone: siteResourcesStack.hostedZoneResources.hostedZone,
    recordName: webHostingSpec.domainName,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudfrontDistribution)),
  });
  _somMeta(siteResourcesStack.siteProps.config, dns2, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  // ----------------------------------------------------------------------
  // SSM Params
  const ssm1 = new ssm.StringParameter(siteResourcesStack, 'SsmCloudfrontDistributionId', {
    parameterName: toSsmParamName(
      siteResourcesStack.somId,
      SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID,
      webHostingSpec.domainName
    ),
    stringValue: cloudfrontDistribution.distributionId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, ssm1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const ssm2 = new ssm.StringParameter(siteResourcesStack, 'SsmCloudfrontDomainName', {
    parameterName: toSsmParamName(
      siteResourcesStack.somId,
      SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME,
      webHostingSpec.domainName
    ),
    stringValue: cloudfrontDistribution.distributionDomainName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, ssm2, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  return {
    cloudfrontFunctionsResources,
    cloudfrontDistribution,
    dnsRecords: [dns1, dns2],
    ssmParams: [ssm1, ssm2],
  };
}
