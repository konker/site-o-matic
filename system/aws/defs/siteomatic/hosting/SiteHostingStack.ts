import * as cdk from '@aws-cdk/core';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as ssm from '@aws-cdk/aws-ssm';
import { SiteProps } from '../../../../../lib';
import { SiteHostingProps, SOM_TAG_NAME, toSsmParamName } from '../common';
import { formulateStackName } from './lib';

export class SiteHostingStack extends cdk.NestedStack {
  public readonly siteProps: SiteProps;
  public readonly somId: string;
  public readonly domainUser: iam.IUser;
  public readonly hostedZone: route53.PublicHostedZone;

  public domainCertificate: certificatemanager.ICertificate;
  public domainBucket: s3.Bucket;
  public originAccessIdentity: cloudfront.OriginAccessIdentity;
  public cloudFrontDistribution: cloudfront.Distribution;

  constructor(scope: cdk.Construct, siteProps: SiteProps, props: SiteHostingProps) {
    super(scope, formulateStackName(siteProps.rootDomain));

    this.siteProps = siteProps;
    this.somId = props.somId;
    this.domainUser = props.domainUser;
    this.hostedZone = props.hostedZone;
  }

  async build() {
    cdk.Tags.of(this).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // Origin access identity which will be used by the cloudfront distribution
    this.originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: `OriginAccessIdentity for ${this.somId}`,
    });
    cdk.Tags.of(this.originAccessIdentity).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // Domain www content bucket and bucket policy
    this.domainBucket = new s3.Bucket(this, 'this.domainBucket', {
      bucketName: `wwwbucket-${this.somId}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    cdk.Tags.of(this.domainBucket).add(SOM_TAG_NAME, this.somId);

    this.domainBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:DeleteObject', 's3:GetObject', 's3:GetObjectVersion', 's3:PutObject', 's3:PutObjectAcl'],
        resources: [`${this.domainBucket.bucketArn}/*`],
        principals: [this.domainUser],
      })
    );
    this.domainBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [this.domainBucket.bucketArn],
        principals: [this.domainUser],
      })
    );
    this.domainBucket.grantRead(this.originAccessIdentity);

    // ----------------------------------------------------------------------
    // SSL certificate for apex and wildcard subdomains
    this.domainCertificate = new certificatemanager.DnsValidatedCertificate(this, 'DomainCertificate', {
      domainName: this.siteProps.rootDomain,
      subjectAlternativeNames: [`*.${this.siteProps.rootDomain}`],
      hostedZone: this.hostedZone,
      region: 'us-east-1',
    });
    cdk.Tags.of(this.domainCertificate).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // Cloudfront distribution
    this.cloudFrontDistribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.domainBucket, {
          originPath: '/www',
          originAccessIdentity: this.originAccessIdentity,
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: new cloudfront.CachePolicy(this, 'CloudFrontDistributionCachePolicy', {
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
          cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        }),
        originRequestPolicy: new cloudfront.OriginRequestPolicy(this, 'OriginRequestPolicy', {
          queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
          cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
        }),
      },
      domainNames: [this.siteProps.rootDomain],
      certificate: this.domainCertificate,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: '/404.html',
        },
      ],
    });
    cdk.Tags.of(this.cloudFrontDistribution).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // DNS records
    new route53.ARecord(this, 'DnsRecordSet_A', {
      zone: this.hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.cloudFrontDistribution)),
    });
    new route53.AaaaRecord(this, 'DnsRecordSet_AAAA', {
      zone: this.hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.cloudFrontDistribution)),
    });

    // ----------------------------------------------------------------------
    // SSM Params
    new ssm.StringParameter(this, 'SSmDomainBucketName', {
      parameterName: toSsmParamName(this.somId, 'domain-bucket-name'),
      stringValue: this.domainBucket.bucketName,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    new ssm.StringParameter(this, 'SsmCloudfrontDistributionId', {
      parameterName: toSsmParamName(this.somId, 'cloudfront-distribution-id'),
      stringValue: this.cloudFrontDistribution.distributionId,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    new ssm.StringParameter(this, 'SsmCloudfrontDomainName', {
      parameterName: toSsmParamName(this.somId, 'cloudfront-domain-name'),
      stringValue: this.cloudFrontDistribution.distributionDomainName,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
  }
}
