import type { OriginBase } from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import type { SiteOMaticConfig } from '../../../../../lib/config/schemas/site-o-matic-config.schema';
import {
  SERVICE_TYPE_REST_API,
  SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID,
  SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME,
} from '../../../../../lib/consts';
import type { RestApiServiceBuilderProps, RestApiServiceResources } from '../../../../../lib/types';
import { _somMeta, searchCertificates } from '../../../../../lib/utils';
import { ExistingRestApiOrigin } from './ExistingRestApiOrigin';

export async function build(
  scope: Construct,
  config: SiteOMaticConfig,
  props: RestApiServiceBuilderProps
): Promise<RestApiServiceResources> {
  if (!props.siteStack.domainUser || !props.siteStack.hostedZoneResources) {
    throw new Error(
      `[site-o-matic] Could not build service sub-stack when domainUser or hostedZoneResources is missing`
    );
  }

  // ----------------------------------------------------------------------
  // Origin access identity which will be used by the cloudfront distribution
  const originAccessIdentity = new cloudfront.OriginAccessIdentity(scope, 'OriginAccessIdentity', {
    comment: `OriginAccessIdentity for ${props.service.domainName}`,
  });
  _somMeta(config, originAccessIdentity, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // Origin
  const origin: OriginBase = (() => {
    switch (props.service.type) {
      case SERVICE_TYPE_REST_API: {
        return new ExistingRestApiOrigin(props.service.url, {
          originPath: props.service.originPath ?? '/',
        });
      }
      default: {
        throw new Error(`[site-o-matic] Unknown service type: ${props.service.type}`);
      }
    }
  })();

  // ----------------------------------------------------------------------
  // Cloudfront distribution
  const certificateResources = searchCertificates(props.siteStack.certificateResources, props.service.certificate);
  if (!certificateResources) {
    throw new Error(`[site-o-matic] Could not find certificate resources for ${props.service.certificate}`);
  }

  const cloudFrontDistribution = new cloudfront.Distribution(
    scope,
    `CloudFrontDistribution-${props.service.domainName}`,
    {
      defaultBehavior: {
        origin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        compress: true,
      },
      domainNames: [props.service.domainName],
      certificate: certificateResources.domainCertificate,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
    }
  );
  _somMeta(config, cloudFrontDistribution, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // DNS records
  const res1 = new route53.ARecord(scope, 'DnsRecordSet_A', {
    zone: props.siteStack.hostedZoneResources.hostedZone,
    recordName: props.service.domainName,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontDistribution)),
  });
  _somMeta(config, res1, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res2 = new route53.AaaaRecord(scope, 'DnsRecordSet_AAAA', {
    zone: props.siteStack.hostedZoneResources.hostedZone,
    recordName: props.service.domainName,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontDistribution)),
  });
  _somMeta(config, res2, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // SSM Params
  const res3 = new ssm.StringParameter(scope, 'SsmCloudfrontDistributionId', {
    parameterName: toSsmParamName(
      props.siteStack.somId,
      SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID,
      props.service.domainName
    ),
    stringValue: cloudFrontDistribution.distributionId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(config, res3, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res4 = new ssm.StringParameter(scope, 'SsmCloudfrontDomainName', {
    parameterName: toSsmParamName(
      props.siteStack.somId,
      SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME,
      props.service.domainName
    ),
    stringValue: cloudFrontDistribution.distributionDomainName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(config, res4, props.siteStack.somId, props.siteStack.siteProps.protected);

  return {
    type: SERVICE_TYPE_REST_API,
    service: props.service,
    originAccessIdentity,
    cloudFrontDistribution,
  };
}
