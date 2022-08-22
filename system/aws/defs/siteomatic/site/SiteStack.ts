import * as dns from 'dns';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as ssm from '@aws-cdk/aws-ssm';
import {
  HostedZoneStackResources,
  SiteCertificateStackResources,
  SiteHostingStackResources,
  SitePipelineResources,
  SiteProps,
  toSsmParamName,
} from '../../../../../lib/types';
import {
  DEFAULT_CERTIFICATE_REGION,
  DEFAULT_STACK_PROPS,
  SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
  SomConfig,
} from '../../../../../lib/consts';
import * as SiteHostedZoneBuilder from '../hostedzone/SiteHostedZoneBuilder';
import * as SiteCertificateBuilder from '../hosting/SiteCertificateBuilder';
import * as SiteHostingBuilder from '../hosting/SiteHostingBuilder';
import * as CodecommitS3SitePipelineBuilder from '../pipeline/codecommit/CodecommitS3SitePipelineBuilder';
import * as CodecommitNpmSitePipelineBuilder from '../pipeline/codecommit/CodecommitNpmSitePipelineBuilder';
import { getSsmParam } from '../../../../../lib/aws/ssm';

export class SiteStack extends cdk.Stack {
  public readonly config: SomConfig;
  public readonly siteProps: SiteProps;
  public readonly somId: string;

  public domainUser: iam.IUser;
  public domainGroup: iam.Group;
  public hostedZoneResources: HostedZoneStackResources;
  public subdomainHostedZoneResources: Record<string, HostedZoneStackResources>;
  public certificateResources: SiteCertificateStackResources;
  public hostingResources: SiteHostingStackResources;
  public sitePipelineResources: SitePipelineResources;

  constructor(scope: cdk.Construct, config: SomConfig, somId: string, props: SiteProps) {
    super(scope, somId, Object.assign({}, DEFAULT_STACK_PROPS(somId), props));

    this.config = Object.assign({}, config);
    this.subdomainHostedZoneResources = {};
    this.siteProps = {
      rootDomain: props.rootDomain,
      webmasterEmail: props.webmasterEmail,
      username: props.username,
      contentProducerId: props.contentProducerId,
      pipelineType: props.pipelineType,
      extraDnsConfig: props.extraDnsConfig ?? [],
      subdomains: props.subdomains ?? [],
      certificateClones: props.certificateClones ?? [],
      protected: props.protected,
      contextParams: props.contextParams ?? {},
    };
    this.somId = somId;
  }

  async build() {
    // ----------------------------------------------------------------------
    new ssm.StringParameter(this, 'SsmRootDomain', {
      parameterName: toSsmParamName(this.somId, 'root-domain'),
      stringValue: this.siteProps.rootDomain,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    new ssm.StringParameter(this, 'SsmWebmasterEmail', {
      parameterName: toSsmParamName(this.somId, 'webmaster-email'),
      stringValue: this.siteProps.webmasterEmail,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });

    // ----------------------------------------------------------------------
    // User for all resources
    this.domainUser = iam.User.fromUserName(this, 'DomainUser', this.siteProps.username);
    this.domainGroup = new iam.Group(this, 'DomainGroup', { groupName: `${this.somId}-group` });
    this.domainGroup.addUser(this.domainUser);

    new ssm.StringParameter(this, 'SsmDomainUserName', {
      parameterName: toSsmParamName(this.somId, 'domain-user-name'),
      stringValue: this.domainUser.userName,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    new ssm.StringParameter(this, 'SsmDomainGroupName', {
      parameterName: toSsmParamName(this.somId, 'domain-group-name'),
      stringValue: this.domainGroup.groupName,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });

    // ----------------------------------------------------------------------
    // HostedZone
    this.hostedZoneResources = SiteHostedZoneBuilder.build(this, {
      domainName: this.siteProps.rootDomain,
      extraDnsConfig: this.siteProps.extraDnsConfig,
      subdomains: this.siteProps.subdomains,
    });

    const verificationTxt = await (async () => {
      try {
        const txtRecords = await dns.promises.resolveTxt(`_som.${this.siteProps.rootDomain}`);
        return txtRecords[0][0];
      } catch (ex) {
        return undefined;
      }
    })();

    const hostedZoneId = await getSsmParam(this.region, toSsmParamName(this.somId, 'hosted-zone-id'));

    if (!verificationTxt || verificationTxt !== hostedZoneId) {
      console.error(
        `WARNING: Missing or invalid site-o-matic verification TXT record found for: ${this.siteProps.rootDomain}`
      );
      return;
    } else {
      console.log(`VERIFIED: ${verificationTxt} === ${hostedZoneId}`);
    }

    // ----------------------------------------------------------------------
    // SSL Certificates
    this.certificateResources = await SiteCertificateBuilder.build(this, {
      region: DEFAULT_CERTIFICATE_REGION,
      domainName: this.siteProps.rootDomain,
      hostedZoneId: this.hostedZoneResources.hostedZone.hostedZoneId,
      subdomains: this.siteProps.subdomains ?? [],
      subdomainHostedZoneIds: Object.keys(this.subdomainHostedZoneResources).reduce((acc, val: string) => {
        acc[val] = this.subdomainHostedZoneResources[val].hostedZone.hostedZoneId;
        return acc;
      }, {} as Record<string, string>),
    });

    // ----------------------------------------------------------------------
    // Hosting
    this.hostingResources = await SiteHostingBuilder.build(this, {
      domainCertificate: this.certificateResources.domainCertificate,
    });

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
