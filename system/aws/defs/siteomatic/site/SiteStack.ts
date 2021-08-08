import * as dns from 'dns';
import * as AWS from 'aws-sdk';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as ssm from '@aws-cdk/aws-ssm';
import {
  HostedZoneStackResources,
  SiteHostingStackResources,
  toSsmParamName,
  SitePipelineResources,
  SiteProps,
} from '../../../../../lib/types';
import {
  DEFAULT_STACK_PROPS,
  SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
} from '../../../../../lib/consts';
import * as SiteHostedZoneBuilder from '../hostedzone/SiteHostedZoneBuilder';
import * as SiteHostingBuilder from '../hosting/SiteHostingBuilder';
import * as CodecommitS3SitePipelineBuilder from '../pipeline/codecommit/CodecommitS3SitePipelineBuilder';
import * as CodecommitNpmSitePipelineBuilder from '../pipeline/codecommit/CodecommitNpmSitePipelineBuilder';

export class SiteStack extends cdk.Stack {
  public readonly siteProps: SiteProps;
  public readonly somId: string;

  public domainUser: iam.IUser;
  public hostedZoneResources: HostedZoneStackResources;
  public hostingResources: SiteHostingStackResources;
  public sitePipelineResources: SitePipelineResources;

  constructor(scope: cdk.Construct, somId: string, props: SiteProps) {
    super(scope, somId, DEFAULT_STACK_PROPS(somId));

    this.siteProps = {
      rootDomain: props.rootDomain,
      webmasterEmail: props.webmasterEmail,
      username: props.username,
      contentProducerId: props.contentProducerId,
      pipelineType: props.pipelineType,
      extraDnsConfig: props.extraDnsConfig,
      protected: props.protected,
    };
    this.somId = somId;
  }

  async build() {
    // ----------------------------------------------------------------------
    new ssm.StringParameter(this, 'SSmRootDomain', {
      parameterName: toSsmParamName(this.somId, 'root-domain'),
      stringValue: this.siteProps.rootDomain,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    new ssm.StringParameter(this, 'SSmWebmasterEmail', {
      parameterName: toSsmParamName(this.somId, 'webmaster-email'),
      stringValue: this.siteProps.webmasterEmail,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });

    // ----------------------------------------------------------------------
    // User for all resources
    this.domainUser = iam.User.fromUserName(this, 'DomainUser', this.siteProps.username);

    new ssm.StringParameter(this, 'SSmDomainUserName', {
      parameterName: toSsmParamName(this.somId, 'domain-user-name'),
      stringValue: this.domainUser.userName,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });

    // ----------------------------------------------------------------------
    // HostedZone
    this.hostedZoneResources = await SiteHostedZoneBuilder.build(this, {
      extraDnsConfig: this.siteProps.extraDnsConfig,
    });

    const verificationTxt = await (async () => {
      try {
        const txtRecords = await dns.promises.resolveTxt(`_som.${this.siteProps.rootDomain}`);
        return txtRecords[0][0];
      } catch (ex) {
        return undefined;
      }
    })();
    const hostedZoneId = await (async () => {
      try {
        AWS.config.update({ region: this.region });
        const ssmSdk = new AWS.SSM();

        const result = await ssmSdk.getParameter({ Name: toSsmParamName(this.somId, 'hosted-zone-id') }).promise();
        return result?.Parameter?.Value;
      } catch (ex) {
        return undefined;
      }
    })();

    if (!verificationTxt || verificationTxt !== hostedZoneId) {
      console.error(
        `WARNING: Missing or invalid site-o-matic verification TXT record found for: ${this.siteProps.rootDomain}`
      );
      return;
    } else {
      console.log(`VERIFIED: ${verificationTxt} === ${hostedZoneId}`);
    }

    // ----------------------------------------------------------------------
    // Hosting
    this.hostingResources = await SiteHostingBuilder.build(this, {});

    // ----------------------------------------------------------------------
    // Pipeline for the site
    switch (this.siteProps.pipelineType) {
      case SITE_PIPELINE_TYPE_CODECOMMIT_S3: {
        this.sitePipelineResources = await CodecommitS3SitePipelineBuilder.build(this, {
          pipelineType: SITE_PIPELINE_TYPE_CODECOMMIT_S3,
        });
        break;
      }
      case SITE_PIPELINE_TYPE_CODECOMMIT_NPM: {
        this.sitePipelineResources = await CodecommitNpmSitePipelineBuilder.build(this, {
          pipelineType: SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
        });
        break;
      }
      default:
        throw new Error(`Could not create pipeline of type: ${this.siteProps.pipelineType}`);
    }
  }
}