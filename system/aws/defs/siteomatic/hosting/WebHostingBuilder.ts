import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import type { WebHostingBuilderProps, WebHostingResources } from '../../../../../lib/types';
import { _removalPolicyFromBoolean, _somMeta } from '../../../../../lib/utils';

export async function build(scope: Construct, props: WebHostingBuilderProps): Promise<WebHostingResources> {
  if (!props.siteStack.domainUser || !props.siteStack.hostedZoneResources) {
    throw new Error(
      `[site-o-matic] Could not build web hosting sub-stack when domainUser or hostedZoneResources is missing`
    );
  }

  // ----------------------------------------------------------------------
  // Origin access identity which will be used by the cloudfront distribution
  const originAccessIdentity = new cloudfront.OriginAccessIdentity(scope, 'OriginAccessIdentity', {
    comment: `OriginAccessIdentity for ${props.siteStack.somId}`,
  });
  _somMeta(originAccessIdentity, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // Domain www content bucket and bucket policy
  const domainBucket = new s3.Bucket(scope, 'DomainBucket', {
    bucketName: `wwwbucket-${props.siteStack.somId}`,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    versioned: false,
    removalPolicy: _removalPolicyFromBoolean(props.siteStack.siteProps.protected),
    autoDeleteObjects: !props.siteStack.siteProps.protected,
  });
  _somMeta(domainBucket, props.siteStack.somId, props.siteStack.siteProps.protected);

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
  domainBucket.grantRead(originAccessIdentity);

  // ----------------------------------------------------------------------
  // Cloudfront distribution
  const cloudFrontDistribution = new cloudfront.Distribution(scope, 'CloudFrontDistribution', {
    defaultBehavior: {
      origin: new origins.S3Origin(domainBucket, {
        originPath: '/www',
        originAccessIdentity: originAccessIdentity,
      }),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: new cloudfront.CachePolicy(scope, 'CloudFrontDistributionCachePolicy', {
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      }),
      originRequestPolicy: new cloudfront.OriginRequestPolicy(scope, 'OriginRequestPolicy', {
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
      }),
    },
    domainNames: [props.siteStack.siteProps.dns.domainName],
    certificate: props.domainCertificate,
    priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    defaultRootObject: 'index.html',
    errorResponses: [
      {
        httpStatus: 404,
        responsePagePath: '/404.html',
      },
    ],
  });
  _somMeta(cloudFrontDistribution, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // DNS records
  const res1 = new route53.ARecord(scope, 'DnsRecordSet_A', {
    zone: props.siteStack.hostedZoneResources.hostedZone,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontDistribution)),
  });
  _somMeta(res1, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res2 = new route53.AaaaRecord(scope, 'DnsRecordSet_AAAA', {
    zone: props.siteStack.hostedZoneResources.hostedZone,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontDistribution)),
  });
  _somMeta(res2, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // SSM Params
  const res3 = new ssm.StringParameter(scope, 'SsmDomainBucketName', {
    parameterName: toSsmParamName(props.siteStack.somId, 'domain-bucket-name'),
    stringValue: domainBucket.bucketName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res3, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res4 = new ssm.StringParameter(scope, 'SsmCloudfrontDistributionId', {
    parameterName: toSsmParamName(props.siteStack.somId, 'cloudfront-distribution-id'),
    stringValue: cloudFrontDistribution.distributionId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res4, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res5 = new ssm.StringParameter(scope, 'SsmCloudfrontDomainName', {
    parameterName: toSsmParamName(props.siteStack.somId, 'cloudfront-domain-name'),
    stringValue: cloudFrontDistribution.distributionDomainName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res5, props.siteStack.somId, props.siteStack.siteProps.protected);

  return {
    domainBucket,
    originAccessIdentity,
    cloudFrontDistribution,
  };
}
