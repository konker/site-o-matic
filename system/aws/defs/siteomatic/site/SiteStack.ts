import * as dns from 'dns';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import {
  CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM,
  CONTENT_PIPELINE_TYPE_CODECOMMIT_S3,
  ContentPipelineType,
} from '../../../../../content';
import { DEFAULT_STACK_PROPS, SOM_TAG_NAME, toSsmParamName } from '../common';
import { formulateSomId, SiteHostedZoneDnsConfig, SiteProps } from '../../../../../lib';
import { SiteHostedZoneStack } from '../hosted-zone/SiteHostedZoneStack';
import { SiteHostingStack } from '../hosting/SiteHostingStack';
import { SitePipelineStack } from '../pipeline/SitePipelineStack';
import { CodecommitS3SitePipelineStack } from '../pipeline/CodecommitS3SitePipelineStack';
import { CodecommitNpmSitePipelineStack } from '../pipeline/CodecommitNpmSitePipelineStack';
import * as ssm from '@aws-cdk/aws-ssm';

export class SiteStack extends cdk.Stack implements SiteProps {
  public readonly rootDomain: string;
  public readonly webmasterEmail: string;
  public readonly contentProducerId: string;
  public readonly pipelineType: ContentPipelineType;
  public readonly protected: boolean;
  public readonly extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
  public readonly somId: string;

  public domainUser: iam.User;
  public hostedZoneStack: SiteHostedZoneStack;
  public hostingStack: SiteHostingStack;
  public pipelineStack: SitePipelineStack;

  constructor(scope: cdk.Construct, params: SiteProps) {
    super(scope, formulateSomId(params.rootDomain), DEFAULT_STACK_PROPS);

    this.rootDomain = params.rootDomain;
    this.webmasterEmail = params.webmasterEmail;
    this.contentProducerId = params.contentProducerId;
    this.pipelineType = params.pipelineType;
    this.extraDnsConfig = params.extraDnsConfig;
    this.protected = params.protected;
    this.somId = formulateSomId(params.rootDomain);
  }

  async build() {
    cdk.Tags.of(this).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // User for all resources
    this.domainUser = new iam.User(this, 'this.domainUser', {
      userName: `user-${this.somId}`,
      path: '/',
      managedPolicies: [],
    });
    cdk.Tags.of(this.domainUser).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // HostedZone stack
    this.hostedZoneStack = new SiteHostedZoneStack(this, {
      somId: this.somId,
      rootDomain: this.rootDomain,
      extraDnsConfig: this.extraDnsConfig,
    });
    await this.hostedZoneStack.build();

    // ----------------------------------------------------------------------
    // SSM Params
    new ssm.StringParameter(this, 'SSmRootDomain', {
      parameterName: toSsmParamName(this.somId, 'root-domain'),
      stringValue: this.rootDomain,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    new ssm.StringParameter(this, 'SSmWebmasterEmail', {
      parameterName: toSsmParamName(this.somId, 'webmaster-email'),
      stringValue: this.webmasterEmail,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    new ssm.StringParameter(this, 'SSmDomainUserArn', {
      parameterName: toSsmParamName(this.somId, 'domain-user-arn'),
      stringValue: this.domainUser.userArn,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    new ssm.StringParameter(this, 'SSmDomainUserName', {
      parameterName: toSsmParamName(this.somId, 'domain-user-name'),
      stringValue: this.domainUser.userName,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });

    // ----------------------------------------------------------------------
    // Base Outputs
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
    new cdk.CfnOutput(this, 'OutputDomainUserArn', {
      description: 'IAM user ARN',
      value: this.domainUser.userArn,
    });
    new cdk.CfnOutput(this, 'OutputDomainUserName', {
      description: 'IAM user name',
      value: this.domainUser.userName,
    });

    let hostedZoneId;
    try {
      const txtRecords = await dns.promises.resolveTxt(`_som.${this.rootDomain}`);
      hostedZoneId = txtRecords[0][0];
    } catch (ex) {
      console.error(`WARNING: No site-o-matic TXT record found for: ${this.rootDomain}`);
    }

    if (!hostedZoneId) return;

    this.hostingStack = new SiteHostingStack(this, this, {
      somId: this.somId,
      domainUser: this.domainUser,
      hostedZone: this.hostedZoneStack.hostedZone,
    });
    await this.hostingStack.build();

    // ----------------------------------------------------------------------
    // Initial content for the site (?)
    /*
    const contentProducer = getContentProducer(this.contentProducerId);
    await contentProducer.init(this);
    const contentResult = await contentProducer.generateContent(this, 'www');
    new deployment.BucketDeployment(this, 'BucketDeployment', {
      sources: [deployment.Source.asset(contentResult.zipFilePath)],
      destinationBucket: this.hostingStack.domainBucket,
    });
    await contentProducer.clean(this);
    */

    // ----------------------------------------------------------------------
    // Pipeline for the site
    switch (this.pipelineType) {
      case CONTENT_PIPELINE_TYPE_CODECOMMIT_S3: {
        this.pipelineStack = new CodecommitS3SitePipelineStack(this, this, {
          somId: this.somId,
          domainUser: this.domainUser,
          pipelineType: CONTENT_PIPELINE_TYPE_CODECOMMIT_S3,
          domainBucket: this.hostingStack.domainBucket,
          cloudfrontDistributionId: this.hostingStack.cloudFrontDistribution.distributionId,
        });
        await this.pipelineStack.build();
        break;
      }
      case CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM: {
        this.pipelineStack = new CodecommitNpmSitePipelineStack(this, this, {
          somId: this.somId,
          domainUser: this.domainUser,
          pipelineType: CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM,
          domainBucket: this.hostingStack.domainBucket,
          cloudfrontDistributionId: this.hostingStack.cloudFrontDistribution.distributionId,
        });
        await this.pipelineStack.build();
        break;
      }
      default:
        throw new Error(`Could not create pipeline of type: ${this.pipelineType}`);
    }

    // ----------------------------------------------------------------------
    // Extra Outputs
    new cdk.CfnOutput(this, 'OutputDomainBucket', {
      description: 'WWW content S3 bucket',
      value: this.hostingStack.domainBucket.bucketName,
    });
    new cdk.CfnOutput(this, 'OutputCloudfrontDistributionId', {
      description: 'Cloudfront distribution ID',
      value: this.hostingStack.cloudFrontDistribution.distributionId,
    });
    new cdk.CfnOutput(this, 'OutputCloudfrontDomainName', {
      description: 'Cloudfront distribution domain name',
      value: this.hostingStack.cloudFrontDistribution.distributionDomainName,
    });
  }
}
