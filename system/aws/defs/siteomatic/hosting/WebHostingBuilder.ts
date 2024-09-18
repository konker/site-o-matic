import { Duration } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import type { Construct } from 'constructs';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import type { SiteOMaticConfig } from '../../../../../lib/config/schemas/site-o-matic-config.schema';
import {
  SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID,
  SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME,
  SSM_PARAM_NAME_DOMAIN_BUCKET_NAME,
  WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
  WEB_HOSTING_DEFAULT_ERROR_RESPONSES,
  WEB_HOSTING_DEFAULT_ORIGIN_PATH,
} from '../../../../../lib/consts';
import type { WebHostingBuilderProps, WebHostingResources } from '../../../../../lib/types';
import { _removalPolicyFromBoolean, _somMeta } from '../../../../../lib/utils';
import { S3OriginWithOACPatch } from './S3OriginWithOACPatchProps';

export async function build(
  scope: Construct,
  config: SiteOMaticConfig,
  props: WebHostingBuilderProps
): Promise<WebHostingResources> {
  if (!props.siteStack.domainUser || !props.siteStack.hostedZoneResources) {
    throw new Error(
      `[site-o-matic] Could not build web hosting sub-stack when domainUser or hostedZoneResources is missing`
    );
  }

  // ----------------------------------------------------------------------
  // Origin Access Control (OAC) which will govern the cloudfront distribution access to the S3 origin bucket
  const originAccessControl = new cloudfront.CfnOriginAccessControl(scope, 'OriginAccessControl', {
    originAccessControlConfig: {
      name: `oac-${props.siteStack.somId}`,
      originAccessControlOriginType: 's3',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
      description: 'Origin access control provisioned by site-o-matic',
    },
  });

  // ----------------------------------------------------------------------
  // Domain www content bucket and bucket policy
  const bucketName = `wwwbucket-${props.siteStack.somId}`;
  const domainBucket = new s3.Bucket(scope, 'DomainBucket', {
    bucketName,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    publicReadAccess: false,
    encryption: s3.BucketEncryption.S3_MANAGED,
    versioned: false,
    removalPolicy: _removalPolicyFromBoolean(props.siteStack.siteProps.protected),
    autoDeleteObjects: !props.siteStack.siteProps.protected,
  });
  _somMeta(config, domainBucket, props.siteStack.somId, props.siteStack.siteProps.protected);

  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ['s3:DeleteObject', 's3:GetObject', 's3:GetObjectVersion', 's3:PutObject', 's3:PutObjectAcl'],
      resources: [`${domainBucket.bucketArn}/*`],
      principals: [props.siteStack.domainUser],
    })
  );
  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [domainBucket.bucketArn],
      principals: [props.siteStack.domainUser],
    })
  );

  // ----------------------------------------------------------------------
  // Add automatically generated content to the bucket if it is empty
  if (props.siteStack.siteProps.siteContentTmpDirPath) {
    if (props.siteStack.siteProps.facts.shouldDeployS3Content) {
      new s3Deployment.BucketDeployment(scope, 'S3BucketContentDeployment', {
        sources: [s3Deployment.Source.asset(props.siteStack.siteProps.siteContentTmpDirPath)],
        destinationBucket: domainBucket,
      });
    }
  }

  // ----------------------------------------------------------------------
  // WAF ACl
  const awsManagedRules = props.siteStack.siteProps.context.manifest.webHosting?.waf?.AWSManagedRules;
  const wafEnabled =
    !!props.siteStack.siteProps.context.manifest.webHosting?.waf?.enabled &&
    awsManagedRules &&
    awsManagedRules.length > 0;

  const wafAcl = wafEnabled
    ? new wafv2.CfnWebACL(scope, 'WafAcl', {
        defaultAction: { allow: {} },
        scope: 'CLOUDFRONT',
        visibilityConfig: {
          cloudWatchMetricsEnabled: false,
          sampledRequestsEnabled: true,
          metricName: `${props.siteStack.somId}-wafAcl`,
        },
        rules: awsManagedRules.map((rule) => ({
          name: rule.name,
          priority: rule.priority,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: rule.name,
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            metricName: `${props.siteStack.somId}-AWSManagedRules`,
            cloudWatchMetricsEnabled: false,
            sampledRequestsEnabled: true,
          },
        })),
        tags: [{ key: config.SOM_TAG_NAME, value: props.siteStack.somId }],
      })
    : undefined;

  // ----------------------------------------------------------------------
  // Response headers policy
  const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(scope, 'SecurityHeadersResponseHeaderPolicy', {
    securityHeadersBehavior: {
      contentSecurityPolicy: {
        override: true,
        contentSecurityPolicy: "default-src 'self'",
      },
      strictTransportSecurity: {
        override: true,
        accessControlMaxAge: Duration.days(2 * 365),
        includeSubdomains: true,
        preload: true,
      },
      contentTypeOptions: {
        override: true,
      },
      referrerPolicy: {
        override: true,
        referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
      },
      xssProtection: {
        override: true,
        protection: true,
        modeBlock: true,
      },
      frameOptions: {
        override: true,
        frameOption: cloudfront.HeadersFrameOption.DENY,
      },
    },
  });
  _somMeta(config, responseHeadersPolicy, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // Cloudfront functions
  const cfFunctions = [
    [...props.cfFunctionViewerRequestTmpFilePath, cloudfront.FunctionEventType.VIEWER_REQUEST],
    [...props.cfFunctionViewerResponseTmpFilePath, cloudfront.FunctionEventType.VIEWER_RESPONSE],
  ].reduce(
    (acc, [cfFunctionId, cfFunctionTmpFilePath, cfFunctionEventType]) => {
      if (cfFunctionTmpFilePath) {
        const func = new cloudfront.Function(scope, `CloudFrontFunction-${cfFunctionId}`, {
          comment: `${cfFunctionId} function for ${props.siteStack.somId}`,
          code: cloudfront.FunctionCode.fromFile({
            filePath: cfFunctionTmpFilePath,
          }),
        });
        return [...acc, [func, cfFunctionEventType] as [cloudfront.Function, cloudfront.FunctionEventType]];
      }
      return acc;
    },
    [] as Array<[cloudfront.Function, cloudfront.FunctionEventType]>
  );

  cfFunctions.forEach(([cfFunction]) => {
    _somMeta(config, cfFunction, props.siteStack.somId, props.siteStack.siteProps.protected);
  });

  // ----------------------------------------------------------------------
  // XXX: Remove when there is first-class CDK support
  const s3OriginWithOacPatch = new S3OriginWithOACPatch(domainBucket, {
    oacId: originAccessControl.getAtt('Id'),
    originPath: props.siteStack.siteProps?.context?.manifest?.webHosting?.originPath ?? WEB_HOSTING_DEFAULT_ORIGIN_PATH,
    originShieldEnabled: false,
  });

  // ----------------------------------------------------------------------
  // Cloudfront distribution
  const cloudFrontDistribution = new cloudfront.Distribution(
    scope,
    'CloudFrontDistribution',
    Object.assign(
      {
        defaultBehavior: Object.assign(
          {
            origin: s3OriginWithOacPatch,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: new cloudfront.CachePolicy(scope, 'CloudFrontDistributionCachePolicy', {
              queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
              cookieBehavior: cloudfront.CacheCookieBehavior.none(),
              enableAcceptEncodingBrotli: true,
              enableAcceptEncodingGzip: true,
            }),
            originRequestPolicy: new cloudfront.OriginRequestPolicy(scope, 'OriginRequestPolicy', {
              queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
              cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
            }),
            compress: true,
          },
          cfFunctions.length > 0
            ? {
                functionAssociations: cfFunctions.map(([cfFunction, cfFunctionEventType]) => ({
                  function: cfFunction,
                  eventType: cfFunctionEventType,
                })),
              }
            : {}
        ),
        domainNames: [props.siteStack.siteProps.context.rootDomainName],
        certificate: props.domainCertificate,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        defaultRootObject:
          props.siteStack.siteProps?.context?.manifest?.webHosting?.defaultRootObject ??
          WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
        enableIpv6: true,
        responseHeadersPolicy,
        errorResponses:
          props.siteStack.siteProps?.context?.manifest?.webHosting?.errorResponses ??
          WEB_HOSTING_DEFAULT_ERROR_RESPONSES,
      },
      wafEnabled && wafAcl ? { webAclId: wafAcl.attrArn } : {}
    )
  );
  _somMeta(config, cloudFrontDistribution, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // Stitch together OAC
  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      sid: 'AllowCloudFrontServicePrincipal',
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com') as never],
      resources: [domainBucket.arnForObjects('*')],
      conditions: {
        StringEquals: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'AWS:SourceArn': `arn:aws:cloudfront::${props.siteStack.account}:distribution/${cloudFrontDistribution.distributionId}`,
        },
      },
    })
  );

  // ----------------------------------------------------------------------
  // DNS records
  const res1 = new route53.ARecord(scope, 'DnsRecordSet_A', {
    zone: props.siteStack.hostedZoneResources.hostedZone,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontDistribution)),
  });
  _somMeta(config, res1, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res2 = new route53.AaaaRecord(scope, 'DnsRecordSet_AAAA', {
    zone: props.siteStack.hostedZoneResources.hostedZone,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontDistribution)),
  });
  _somMeta(config, res2, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // SSM Params
  const res3 = new ssm.StringParameter(scope, 'SsmDomainBucketName', {
    parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_DOMAIN_BUCKET_NAME),
    stringValue: domainBucket.bucketName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(config, res3, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res4 = new ssm.StringParameter(scope, 'SsmCloudfrontDistributionId', {
    parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID, 'www'),
    stringValue: cloudFrontDistribution.distributionId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(config, res4, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res5 = new ssm.StringParameter(scope, 'SsmCloudfrontDomainName', {
    parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME, 'www'),
    stringValue: cloudFrontDistribution.distributionDomainName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(config, res5, props.siteStack.somId, props.siteStack.siteProps.protected);

  return {
    domainBucket,
    originAccessControl,
    cloudFrontDistribution,
  };
}
