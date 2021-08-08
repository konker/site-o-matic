import * as cdk from '@aws-cdk/core';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as ssm from '@aws-cdk/aws-ssm';
import { SiteHostingProps, SiteHostingStackResources, toSsmParamName } from '../../../../../lib/types';
import { SiteStack } from '../site/SiteStack';

export async function build(siteStack: SiteStack, props: SiteHostingProps): Promise<SiteHostingStackResources> {
  // ----------------------------------------------------------------------
  // Origin access identity which will be used by the cloudfront distribution
  const originAccessIdentity = new cloudfront.OriginAccessIdentity(siteStack, 'OriginAccessIdentity', {
    comment: `OriginAccessIdentity for ${siteStack.somId}`,
  });

  // ----------------------------------------------------------------------
  // Domain www content bucket and bucket policy
  const domainBucket = new s3.Bucket(siteStack, 'DomainBucket', {
    bucketName: `wwwbucket-${siteStack.somId}`,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    versioned: false,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  });

  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ['s3:DeleteObject', 's3:GetObject', 's3:GetObjectVersion', 's3:PutObject', 's3:PutObjectAcl'],
      resources: [`${domainBucket.bucketArn}/*`],
      principals: [siteStack.domainUser],
    })
  );
  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [domainBucket.bucketArn],
      principals: [siteStack.domainUser],
    })
  );
  domainBucket.grantRead(originAccessIdentity);

  // ----------------------------------------------------------------------
  // SSL certificate for apex and wildcard subdomains
  const domainCertificate = new certificatemanager.DnsValidatedCertificate(siteStack, 'DomainCertificate', {
    domainName: siteStack.siteProps.rootDomain,
    subjectAlternativeNames: [`*.${siteStack.siteProps.rootDomain}`],
    hostedZone: siteStack.hostedZoneResources.hostedZone,
    region: 'us-east-1',
  });

  // ----------------------------------------------------------------------
  // Cloudfront distribution
  const cloudFrontDistribution = new cloudfront.Distribution(siteStack, 'CloudFrontDistribution', {
    defaultBehavior: {
      origin: new origins.S3Origin(domainBucket, {
        originPath: '/www',
        originAccessIdentity: originAccessIdentity,
      }),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: new cloudfront.CachePolicy(siteStack, 'CloudFrontDistributionCachePolicy', {
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      }),
      originRequestPolicy: new cloudfront.OriginRequestPolicy(siteStack, 'OriginRequestPolicy', {
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
      }),
    },
    domainNames: [siteStack.siteProps.rootDomain],
    certificate: domainCertificate,
    priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    defaultRootObject: 'index.html',
    errorResponses: [
      {
        httpStatus: 404,
        responsePagePath: '/404.html',
      },
    ],
  });

  // ----------------------------------------------------------------------
  // DNS records
  new route53.ARecord(siteStack, 'DnsRecordSet_A', {
    zone: siteStack.hostedZoneResources.hostedZone,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontDistribution)),
  });
  new route53.AaaaRecord(siteStack, 'DnsRecordSet_AAAA', {
    zone: siteStack.hostedZoneResources.hostedZone,
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontDistribution)),
  });

  // ----------------------------------------------------------------------
  // SSM Params
  new ssm.StringParameter(siteStack, 'SSmDomainBucketName', {
    parameterName: toSsmParamName(siteStack.somId, 'domain-bucket-name'),
    stringValue: domainBucket.bucketName,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });
  new ssm.StringParameter(siteStack, 'SsmCloudfrontDistributionId', {
    parameterName: toSsmParamName(siteStack.somId, 'cloudfront-distribution-id'),
    stringValue: cloudFrontDistribution.distributionId,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });
  new ssm.StringParameter(siteStack, 'SsmCloudfrontDomainName', {
    parameterName: toSsmParamName(siteStack.somId, 'cloudfront-domain-name'),
    stringValue: cloudFrontDistribution.distributionDomainName,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });

  return {
    domainCertificate,
    domainBucket,
    originAccessIdentity,
    cloudFrontDistribution,
  };
}