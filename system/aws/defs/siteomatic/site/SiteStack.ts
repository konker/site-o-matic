import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import {
  HostedZoneStackResources,
  SiteCertificateStackResources,
  SiteHostingStackResources,
  SitePipelineResources,
  SiteProps,
  toSsmParamName,
} from "../../../../../lib/types";
import {
  DEFAULT_CERTIFICATE_REGION,
  DEFAULT_STACK_PROPS,
  SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
  SomConfig,
} from "../../../../../lib/consts";
import * as SiteHostedZoneBuilder from "../hostedzone/SiteHostedZoneBuilder";
import * as SiteCertificateBuilder from "../hosting/SiteCertificateBuilder";
import * as SiteHostingBuilder from "../hosting/SiteHostingBuilder";
import * as CodecommitS3SitePipelineBuilder from "../pipeline/codecommit/CodecommitS3SitePipelineBuilder";
import * as CodecommitNpmSitePipelineBuilder from "../pipeline/codecommit/CodecommitNpmSitePipelineBuilder";
import { Construct } from "constructs";
import { _id, _somMeta } from "../../../../../lib/utils";

export class SiteStack extends cdk.Stack {
  public readonly config: SomConfig;
  public readonly siteProps: SiteProps;
  public readonly somId: string;

  public domainUser: iam.IUser;
  public domainRole: iam.Role;
  public domainPolicy: iam.Policy;
  public hostedZoneResources: HostedZoneStackResources;
  public certificateResources: SiteCertificateStackResources;
  public hostingResources: SiteHostingStackResources;
  public sitePipelineResources: SitePipelineResources;
  public crossAccountGrantRoles: Array<iam.IRole>;

  constructor(
    scope: Construct,
    config: SomConfig,
    somId: string,
    props: SiteProps
  ) {
    super(
      scope,
      somId,
      Object.assign({}, DEFAULT_STACK_PROPS(somId, props), props)
    );

    this.config = Object.assign({}, config);
    this.siteProps = {
      rootDomain: props.rootDomain,
      webmasterEmail: props.webmasterEmail,
      username: props.username,
      contentProducerId: props.contentProducerId,
      pipelineType: props.pipelineType,
      extraDnsConfig: props.extraDnsConfig ?? [],
      subdomains: props.subdomains ?? [],
      certificateClones: props.certificateClones ?? [],
      crossAccountAccess: props.crossAccountAccess ?? [],
      protected: props.protected,
      contextParams: props.contextParams ?? {},
      env: props.env ?? {},
    };
    this.somId = somId;
  }

  async build() {
    // ----------------------------------------------------------------------
    const res1 = new ssm.StringParameter(this, "SsmRootDomain", {
      parameterName: toSsmParamName(this.somId, "root-domain"),
      stringValue: this.siteProps.rootDomain,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(res1, this.somId, this.siteProps.protected);

    const res2 = new ssm.StringParameter(this, "SsmWebmasterEmail", {
      parameterName: toSsmParamName(this.somId, "webmaster-email"),
      stringValue: this.siteProps.webmasterEmail,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(res2, this.somId, this.siteProps.protected);

    // ----------------------------------------------------------------------
    // User for all resources
    this.domainUser = iam.User.fromUserName(
      this,
      "DomainUser",
      this.siteProps.username
    );

    // ----------------------------------------------------------------------
    // Policy for access to resources
    this.domainPolicy = new iam.Policy(this, "DomainPolicy", {
      statements: [],
    });
    _somMeta(this.domainPolicy, this.somId, this.siteProps.protected);

    // ----------------------------------------------------------------------
    // Initialize cross account access grant roles, if any
    this.crossAccountGrantRoles = this.siteProps.crossAccountAccess.map(
      (spec) =>
        iam.Role.fromRoleArn(
          this,
          _id("CrossAccountGrantRole", spec.name, false),
          spec.arn,
          {
            mutable: true,
          }
        )
    );

    // ----------------------------------------------------------------------
    // HostedZone
    this.hostedZoneResources = SiteHostedZoneBuilder.build(this, {
      domainName: this.siteProps.rootDomain,
      extraDnsConfig: this.siteProps.extraDnsConfig,
      subdomains: this.siteProps.subdomains,
    });

    // ----------------------------------------------------------------------
    // SSL Certificates
    this.certificateResources = await SiteCertificateBuilder.build(this, {
      region: DEFAULT_CERTIFICATE_REGION,
      domainName: this.siteProps.rootDomain,
      hostedZoneId: this.hostedZoneResources.hostedZone.hostedZoneId,
      subdomains: this.siteProps.subdomains ?? [],
    });

    // ----------------------------------------------------------------------
    // Hosting
    this.hostingResources = await SiteHostingBuilder.build(this, {
      domainCertificate: this.certificateResources.domainCertificate,
    });

    // ----------------------------------------------------------------------
    // Allow cross account roles to assume domain role
    if (this.siteProps.crossAccountAccess.length > 0) {
      this.domainRole = new iam.Role(this, "DomainRole", {
        assumedBy: new iam.CompositePrincipal(...this.crossAccountGrantRoles),
      });
      _somMeta(this.domainRole, this.somId, this.siteProps.protected);
      this.domainRole.attachInlinePolicy(this.domainPolicy);
    }

    // ----------------------------------------------------------------------
    // Pipeline for the site
    switch (this.siteProps.pipelineType) {
      case SITE_PIPELINE_TYPE_CODECOMMIT_S3: {
        this.sitePipelineResources =
          await CodecommitS3SitePipelineBuilder.build(this, {
            pipelineType: SITE_PIPELINE_TYPE_CODECOMMIT_S3,
          });
        break;
      }
      case SITE_PIPELINE_TYPE_CODECOMMIT_NPM: {
        this.sitePipelineResources =
          await CodecommitNpmSitePipelineBuilder.build(this, {
            pipelineType: SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
          });
        break;
      }
      default:
        throw new Error(
          `Could not create pipeline of type: ${this.siteProps.pipelineType}`
        );
    }

    // ----------------------------------------------------------------------
    // Set the protection status SSM param
    const res3 = new ssm.StringParameter(this, "SsmProtectedStatus", {
      parameterName: toSsmParamName(this.somId, "protected-status"),
      stringValue: this.siteProps.protected ? "true" : "false",
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(res3, this.somId, this.siteProps.protected);
  }
}
