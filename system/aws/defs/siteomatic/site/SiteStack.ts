import * as cdk from 'aws-cdk-lib';
import type { IPrincipal } from 'aws-cdk-lib/aws-iam';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import cloneDeep from 'lodash.clonedeep';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import {
  DEFAULT_STACK_PROPS,
  SSM_PARAM_NAME_DOMAIN_ROLE_ARN,
  SSM_PARAM_NAME_DOMAIN_USER_NAME,
  SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN,
  SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_NAME,
  SSM_PARAM_NAME_PROTECTED_STATUS,
  SSM_PARAM_NAME_ROOT_DOMAIN_NAME,
  SSM_PARAM_NAME_SOM_VERSION,
  SSM_PARAM_NAME_WEBMASTER_EMAIL,
  VERSION,
} from '../../../../../lib/consts';
import type {
  CertificateResources,
  CrossAccountAccessGrantRoleSpec,
  HostedZoneResources,
  PipelineResources,
  ServiceResources,
  SiteStackProps,
  SomConfig,
  WebHostingResources,
} from '../../../../../lib/types';
import { _id, _somMeta, _somTag } from '../../../../../lib/utils';
import { SiteCertificateNestedStack } from './nested/SiteCertificateNestedStack';
import { SiteDnsNestedStack } from './nested/SiteDnsNestedStack';
import { SitePipelineNestedStack } from './nested/SitePipelineNestedStack';
import { SiteServicesNestedStack } from './nested/SiteServicesNestedStack';
import { SiteWebHostingNestedStack } from './nested/SiteWebHostingNestedStack';

export class SiteStack extends cdk.Stack {
  public readonly config: SomConfig;
  public readonly siteProps: SiteStackProps;
  public readonly somId: string;

  public domainUser?: iam.IUser | undefined;
  public domainRole?: iam.Role | undefined;
  public domainPolicy?: iam.Policy | undefined;
  public crossAccountGrantRoles?: Array<iam.IRole>;
  public notificationsSnsTopic?: sns.Topic | undefined;

  public hostedZoneResources?: HostedZoneResources | undefined;
  public certificateResources?: CertificateResources | undefined;
  public hostingResources?: WebHostingResources | undefined;
  public sitePipelineResources?: PipelineResources | undefined;
  public servicesResources?: Array<ServiceResources> | undefined;

  constructor(scope: Construct, props: SiteStackProps) {
    const stackId = props.context.somId;
    super(scope, stackId, Object.assign({}, DEFAULT_STACK_PROPS(props.config, props.context.somId, props), props));

    this.config = cloneDeep(props.config);
    this.siteProps = cloneDeep(props);
    this.somId = props.context.somId;

    console.log(`Created SiteStack [${stackId}]`);
  }

  async build() {
    // ----------------------------------------------------------------------
    const res0a = new ssm.StringParameter(this, 'SsmSiteEntryRootDomainName', {
      parameterName: `/som/site/root-domain-name/${this.siteProps.context.rootDomainName}`,
      stringValue: this.somId,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(this.config, res0a, this.somId, this.siteProps.protected);

    const res0b = new ssm.StringParameter(this, 'SsmSiteEntrySomId', {
      parameterName: `/som/site/som-id/${this.somId}`,
      stringValue: this.siteProps.context.rootDomainName,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(this.config, res0b, this.somId, this.siteProps.protected);

    const res1 = new ssm.StringParameter(this, 'SsmRootDomain', {
      parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_ROOT_DOMAIN_NAME),
      stringValue: this.siteProps.context.rootDomainName,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(this.config, res1, this.somId, this.siteProps.protected);

    if (this.siteProps.context.manifest.webmasterEmail) {
      const res2 = new ssm.StringParameter(this, 'SsmWebmasterEmail', {
        parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_WEBMASTER_EMAIL),
        stringValue: this.siteProps.context.manifest.webmasterEmail,
        tier: ssm.ParameterTier.STANDARD,
      });
      _somMeta(this.config, res2, this.somId, this.siteProps.protected);
    }

    const res3 = new ssm.StringParameter(this, 'SsmProtectedStatus', {
      parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_PROTECTED_STATUS),
      stringValue: this.siteProps.protected ? 'true' : 'false',
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(this.config, res3, this.somId, this.siteProps.protected);

    const res4 = new ssm.StringParameter(this, 'SsmDomainUserName', {
      parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_DOMAIN_USER_NAME),
      stringValue: this.siteProps.username,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(this.config, res4, this.somId, this.siteProps.protected);

    const res5 = new ssm.StringParameter(this, 'SsmSomVersion', {
      parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_SOM_VERSION),
      stringValue: VERSION,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(this.config, res5, this.somId, this.siteProps.protected);

    // ----------------------------------------------------------------------
    // User for all resources
    this.domainUser = iam.User.fromUserName(this, 'DomainUser', this.siteProps.username);

    // ----------------------------------------------------------------------
    // Policy for access to resources
    this.domainPolicy = new iam.Policy(this, 'DomainPolicy', {
      statements: [],
    });
    _somMeta(this.config, this.domainPolicy, this.somId, this.siteProps.protected);

    // ----------------------------------------------------------------------
    // Initialize cross account access grant roles, if any
    const crossAccountAccess = this.siteProps.context.manifest.crossAccountAccess ?? [];
    this.crossAccountGrantRoles = crossAccountAccess.map((spec: CrossAccountAccessGrantRoleSpec) =>
      iam.Role.fromRoleArn(this, _id('CrossAccountGrantRole', spec.name, false), spec.arn, {
        mutable: true,
      })
    );

    // ----------------------------------------------------------------------
    // SNS topic for pipeline notifications
    this.notificationsSnsTopic = new sns.Topic(this, 'NotificationsSnsTopic', {
      displayName: `NotificationsSnsTopic-${this.somId}`,
      topicName: `NotificationsSnsTopic-${this.somId}`,
    });
    this.notificationsSnsTopic.grantPublish(this.domainUser);
    _somMeta(this.config, this.notificationsSnsTopic, this.somId, this.siteProps.protected);

    const res6 = new ssm.StringParameter(this, 'SsmSnsTopicName', {
      parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_NAME),
      stringValue: this.notificationsSnsTopic.topicName,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(this.config, res6, this.somId, this.siteProps.protected);

    const res7 = new ssm.StringParameter(this, 'SsmSnsTopicArn', {
      parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN),
      stringValue: this.notificationsSnsTopic.topicArn,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(this.config, res7, this.somId, this.siteProps.protected);

    // ----------------------------------------------------------------------
    // DNS / HostedZone
    const dnsNestedStack = new SiteDnsNestedStack(this, {
      description: `Site-o-Matic DNS sub-stack for ${this.siteProps.context.rootDomainName}`,
    });
    await dnsNestedStack.build();
    _somTag(this.config, dnsNestedStack, this.somId);

    // Check to see if DNS has been configured correctly,
    // including that the nameservers have been set with the registrar
    if (this.siteProps.facts.isAwsRoute53RegisteredDomain || this.siteProps.facts.hostedZoneVerified) {
      // ----------------------------------------------------------------------
      // SNS topic subscription
      if (this.siteProps.context.webmasterEmail && this.siteProps.facts.shouldSubscribeEmailToNotificationsSnsTopic) {
        const snsTopicSubscription = new sns.Subscription(this, 'NotificationsSnsTopicSubscription', {
          topic: this.notificationsSnsTopic,
          protocol: sns.SubscriptionProtocol.EMAIL,
          endpoint: this.siteProps.context.webmasterEmail,
        });
        _somMeta(this.config, snsTopicSubscription, this.somId, this.siteProps.protected);
      }

      // ----------------------------------------------------------------------
      // SSL Certificates
      const certificateNestedStack = new SiteCertificateNestedStack(this, {
        description: `Site-o-Matic certificate sub-stack for ${this.siteProps.context.rootDomainName}`,
      });
      await certificateNestedStack.build();
      certificateNestedStack.addDependency(dnsNestedStack);
      _somTag(this.config, certificateNestedStack, this.somId);

      // ----------------------------------------------------------------------
      // Web Hosting
      const webHostingNestedStack = new SiteWebHostingNestedStack(this, {
        description: `Site-o-Matic web hosting sub-stack for ${this.siteProps.context.rootDomainName}`,
      });
      await webHostingNestedStack.build();
      webHostingNestedStack.addDependency(certificateNestedStack);
      _somTag(this.config, webHostingNestedStack, this.somId);

      // ----------------------------------------------------------------------
      // Pipeline for the site
      if (this.siteProps.context.manifest.pipeline) {
        const pipelineNestedStack = new SitePipelineNestedStack(this, {
          description: `Site-o-Matic pipeline nested stack for ${this.siteProps.context.rootDomainName}`,
        });
        await pipelineNestedStack.build();
        pipelineNestedStack.addDependency(webHostingNestedStack);
        _somTag(this.config, pipelineNestedStack, this.somId);
      }

      // ----------------------------------------------------------------------
      // Services
      // [NOTE: currently we assume RestApiServiceSpec as the only option]
      this.servicesResources = [];
      if (this.siteProps.facts.shouldDeployServices) {
        const servicesNestedStack = new SiteServicesNestedStack(this, {
          description: `Site-o-Matic services nested stack for ${this.siteProps.context.rootDomainName}`,
        });
        await servicesNestedStack.build();
        servicesNestedStack.addDependency(certificateNestedStack);
        _somTag(this.config, servicesNestedStack, this.somId);
      }

      // ----------------------------------------------------------------------
      // Allow cross account roles to assume domain role
      if (crossAccountAccess.length > 0) {
        this.domainRole = new iam.Role(this, 'DomainRole', {
          assumedBy: new iam.CompositePrincipal(...this.crossAccountGrantRoles) as IPrincipal,
        });
        _somMeta(this.config, this.domainRole, this.somId, this.siteProps.protected);
        this.domainRole.attachInlinePolicy(this.domainPolicy);

        const res6 = new ssm.StringParameter(this, 'SsmDomainRoleArn', {
          parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_DOMAIN_ROLE_ARN),
          stringValue: this.domainRole.roleArn,
          tier: ssm.ParameterTier.STANDARD,
        });
        _somMeta(this.config, res6, this.somId, this.siteProps.protected);
      }
    }
  }
}
