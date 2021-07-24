import * as dns from 'dns';
import * as cdk from '@aws-cdk/core';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as deployment from '@aws-cdk/aws-s3-deployment';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import { getContentProducer } from '../../../../content';
import { formulateStackName } from './lib';
import { DEFAULT_STACK_PROPS, SOM_TAG_NAME } from '../common';
import { SomSiteParams } from '../../../../lib';

export class SomSiteStack extends cdk.Stack implements SomSiteParams {
  public rootDomain: string;
  public webmasterEmail: string;
  public contentProducerId: string;
  public somId: string;

  constructor(scope: cdk.Construct, params: SomSiteParams) {
    super(scope, formulateStackName(params.rootDomain), DEFAULT_STACK_PROPS);

    this.rootDomain = params.rootDomain;
    this.webmasterEmail = params.webmasterEmail;
    this.contentProducerId = params.contentProducerId;
    this.somId = formulateStackName(params.rootDomain);
  }

  async build() {
    cdk.Tags.of(this).add(SOM_TAG_NAME, this.somId);

    let hostedZoneId;
    try {
      const txtRecords = await dns.promises.resolveTxt(`_som.${this.rootDomain}`);
      hostedZoneId = txtRecords[0][0];
    } catch (ex) {
      console.error(`WARNING: No site-o-matic TXT record found for: ${this.rootDomain}`);
    }

    if (!hostedZoneId) return;

    // ----------------------------------------------------------------------
    // NOTE: This must already exist
    const HostedZone = route53.PublicHostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      zoneName: this.rootDomain,
      hostedZoneId: hostedZoneId,
    });

    const DomainUser = new iam.User(this, 'DomainUser', {
      userName: `user-${this.somId}`,
      path: '/',
      managedPolicies: [],
    });
    // @ts-ignore
    cdk.Tags.of(DomainUser).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // Origin access identity which will be used by the cloudfront distribution
    const OriginAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: `OriginAccessIdentity for ${this.somId}`,
    });
    // @ts-ignore
    cdk.Tags.of(OriginAccessIdentity).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // Domain www content bucket and bucket policy
    const DomainWebBucket = new s3.Bucket(this, 'DomainWebBucket', {
      bucketName: `wwwbucket-${this.somId}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    // @ts-ignore
    cdk.Tags.of(DomainWebBucket).add(SOM_TAG_NAME, this.somId);

    DomainWebBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:DeleteObject', 's3:GetObject', 's3:GetObjectVersion', 's3:PutObject', 's3:PutObjectAcl'],
        resources: [`${DomainWebBucket.bucketArn}/*`],
        principals: [DomainUser],
      })
    );
    DomainWebBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [DomainWebBucket.bucketArn],
        principals: [DomainUser],
      })
    );
    DomainWebBucket.grantRead(OriginAccessIdentity);

    // ----------------------------------------------------------------------
    // Content for www bucket
    const contentProducer = getContentProducer(this.contentProducerId);
    await contentProducer.init(this);
    const zipFilePath = await contentProducer.generateContent(this);
    new deployment.BucketDeployment(this, 'BucketDeployment', {
      sources: [deployment.Source.asset(zipFilePath)],
      destinationBucket: DomainWebBucket,
    });
    await contentProducer.clean(this);

    // ----------------------------------------------------------------------
    // SSL certificate
    const DomainCertificate = new certificatemanager.DnsValidatedCertificate(this, 'DomainCertificate', {
      domainName: this.rootDomain,
      hostedZone: HostedZone,
      region: 'us-east-1',
    });
    // @ts-ignore
    cdk.Tags.of(DomainCertificate).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // Cloudfront distribution
    const CloudFrontDistribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(DomainWebBucket, {
          originPath: '/',
          originAccessIdentity: OriginAccessIdentity,
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
      domainNames: [this.rootDomain],
      certificate: DomainCertificate,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: '/404.html',
        },
      ],
    });
    // @ts-ignore
    cdk.Tags.of(CloudFrontDistribution).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // DNS records
    new route53.ARecord(this, 'DnsRecordSet_A', {
      zone: HostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(CloudFrontDistribution)),
    });
    new route53.AaaaRecord(this, 'DnsRecordSet_AAAA', {
      zone: HostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(CloudFrontDistribution)),
    });

    // ----------------------------------------------------------------------
    // Outputs
    new cdk.CfnOutput(this, 'OutputRootDomainName', {
      description: 'Root domain name',
      value: this.rootDomain,
    });
    new cdk.CfnOutput(this, 'OutputWebmasterEmail', {
      description: 'Webmaster email address',
      value: this.webmasterEmail,
    });
    new cdk.CfnOutput(this, 'OutputSomId', {
      description: 'Site-O-Matic stack ID',
      value: this.somId,
    });
    new cdk.CfnOutput(this, 'OutputDomainUser', {
      description: 'IAM user',
      value: DomainUser.userArn,
    });
    new cdk.CfnOutput(this, 'OutputDomainBucketDomainName', {
      description: 'S3 bucket domain name',
      value: DomainWebBucket.bucketDomainName,
    });
    new cdk.CfnOutput(this, 'OutputDomainCertificate', {
      description: 'domain certificate',
      value: DomainCertificate.certificateArn,
    });
    new cdk.CfnOutput(this, 'OutputDomainBucketUrl', {
      description: 'S3 bucket URL',
      value: DomainWebBucket.bucketWebsiteUrl,
    });
    new cdk.CfnOutput(this, 'OutputCloudfrontDistributionId', {
      description: 'Cloudfront distribution ID',
      value: CloudFrontDistribution.distributionId,
    });
    new cdk.CfnOutput(this, 'OutputCloudfrontDomainName', {
      description: 'Cloudfront distribution domain name',
      value: CloudFrontDistribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, 'OutputHostedZoneId', {
      description: 'Route53 Hosted Zone ID',
      value: HostedZone.hostedZoneId,
    });
    new cdk.CfnOutput(this, 'OutputOriginAccessIdentity', {
      description: 'OriginAccessIdentity',
      value: OriginAccessIdentity.originAccessIdentityName,
    });
  }
}
