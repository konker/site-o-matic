import * as cdk from 'aws-cdk-lib';
import type { IPrincipal } from 'aws-cdk-lib/aws-iam';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import cloneDeep from 'lodash.clonedeep';

import { getSomSsmParam, toSsmParamName } from '../../../../../lib/aws/ssm';
import {
  DEFAULT_STACK_PROPS,
  SSM_PARAM_NAME_DOMAIN_USER_NAME,
  SSM_PARAM_NAME_HOSTED_ZONE_ID,
  SSM_PARAM_NAME_PROTECTED_STATUS,
  SSM_PARAM_NAME_SNS_TOPIC_NAME,
  SSM_PARAM_NAME_SOM_VERSION,
  VERSION,
} from '../../../../../lib/consts';
import { getSomTxtRecordViaDns } from '../../../../../lib/status';
import type {
  CertificateResources,
  CrossAccountAccessGrantRoleSpec,
  HostedZoneResources,
  PipelineResources,
  SiteStackProps,
  SomConfig,
  WebHostingResources,
} from '../../../../../lib/types';
import { _id, _somMeta, _somTag } from '../../../../../lib/utils';
import { SiteCertificateCloneSubStack } from './substacks/SiteCertificateCloneSubStack';
import { SiteCertificateSubStack } from './substacks/SiteCertificateSubStack';
import { SiteDnsSubStack } from './substacks/SiteDnsSubStack';
import { SitePipelineSubStack } from './substacks/SitePipelineSubStack';
import { SiteWebHostingSubStack } from './substacks/SiteWebHostingSubStack';

export class SiteStack extends cdk.Stack {
  public readonly config: SomConfig;
  public readonly siteProps: SiteStackProps;
  public readonly somId: string;

  public domainUser?: iam.IUser | undefined;
  public domainRole?: iam.Role | undefined;
  public domainPolicy?: iam.Policy | undefined;
  public crossAccountGrantRoles?: Array<iam.IRole>;
  public snsTopic?: sns.Topic | undefined;

  public hostedZoneResources?: HostedZoneResources | undefined;
  public certificateResources?: CertificateResources | undefined;
  public hostingResources?: WebHostingResources | undefined;
  public sitePipelineResources?: PipelineResources | undefined;

  constructor(scope: Construct, config: SomConfig, somId: string, props: SiteStackProps) {
    super(scope, somId, Object.assign({}, DEFAULT_STACK_PROPS(somId, props), props));

    this.config = cloneDeep(config);
    this.siteProps = cloneDeep(props);
    this.somId = somId;
    console.log('Created SiteStack');
  }

  async build() {
    // ----------------------------------------------------------------------
    const res1 = new ssm.StringParameter(this, 'SsmRootDomain', {
      parameterName: toSsmParamName(this.somId, 'root-domain-name'),
      stringValue: this.siteProps.rootDomainName,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(res1, this.somId, this.siteProps.protected);

    if (this.siteProps.webmasterEmail) {
      const res2 = new ssm.StringParameter(this, 'SsmWebmasterEmail', {
        parameterName: toSsmParamName(this.somId, 'webmaster-email'),
        stringValue: this.siteProps.webmasterEmail,
        tier: ssm.ParameterTier.STANDARD,
      });
      _somMeta(res2, this.somId, this.siteProps.protected);
    }

    const res3 = new ssm.StringParameter(this, 'SsmProtectedStatus', {
      parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_PROTECTED_STATUS),
      stringValue: this.siteProps.protected ? 'true' : 'false',
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(res3, this.somId, this.siteProps.protected);

    const res4 = new ssm.StringParameter(this, 'SsmDomainUserName', {
      parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_DOMAIN_USER_NAME),
      stringValue: this.siteProps.username,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(res4, this.somId, this.siteProps.protected);

    const res5 = new ssm.StringParameter(this, 'SsmSomVersion', {
      parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_SOM_VERSION),
      stringValue: VERSION,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(res5, this.somId, this.siteProps.protected);

    // ----------------------------------------------------------------------
    // User for all resources
    this.domainUser = iam.User.fromUserName(this, 'DomainUser', this.siteProps.username);

    // ----------------------------------------------------------------------
    // Policy for access to resources
    this.domainPolicy = new iam.Policy(this, 'DomainPolicy', {
      statements: [],
    });
    _somMeta(this.domainPolicy, this.somId, this.siteProps.protected);

    // ----------------------------------------------------------------------
    // Initialize cross account access grant roles, if any
    const crossAccountAccess = this.siteProps.crossAccountAccess ?? [];
    this.crossAccountGrantRoles = crossAccountAccess.map((spec: CrossAccountAccessGrantRoleSpec) =>
      iam.Role.fromRoleArn(this, _id('CrossAccountGrantRole', spec.name, false), spec.arn, {
        mutable: true,
      })
    );

    // ----------------------------------------------------------------------
    // SNS topic
    this.snsTopic = new sns.Topic(this, 'SnsTopic', {
      displayName: `SnsTopic-${this.somId}`,
    });
    _somMeta(this.snsTopic, this.somId, this.siteProps.protected);

    const res6 = new ssm.StringParameter(this, 'SnsTopicName', {
      parameterName: toSsmParamName(this.somId, SSM_PARAM_NAME_SNS_TOPIC_NAME),
      stringValue: this.snsTopic.topicName,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(res6, this.somId, this.siteProps.protected);

    // ----------------------------------------------------------------------
    // DNS / HostedZone
    const dnsSubStack = new SiteDnsSubStack(this, {
      description: `Site-o-Matic DNS sub-stack for ${this.siteProps.rootDomainName}`,
    });
    await dnsSubStack.build();
    _somTag(dnsSubStack, this.somId);

    const verificationTxtRecordViaDns = await getSomTxtRecordViaDns(this.siteProps.rootDomainName);
    const verificationSsmParam = await getSomSsmParam(this.somId, this.region, SSM_PARAM_NAME_HOSTED_ZONE_ID);

    // Check to see if DNS has been configured correctly,
    // including that the nameservers have been set with the registrar
    if (verificationTxtRecordViaDns && verificationTxtRecordViaDns === verificationSsmParam) {
      // ----------------------------------------------------------------------
      // SSL Certificates
      const certificateSubStack = new SiteCertificateSubStack(this, {
        description: `Site-o-Matic certificate sub-stack for ${this.siteProps.rootDomainName}`,
      });
      await certificateSubStack.build();
      certificateSubStack.addDependency(dnsSubStack);
      _somTag(certificateSubStack, this.somId);

      // ----------------------------------------------------------------------
      // Certificate clones, if any
      const certificateClones = this.siteProps.certificate?.clones ?? [];
      if (certificateClones.length > 0) {
        for (const certificateClone of certificateClones) {
          const certificateCloneSubStack = new SiteCertificateCloneSubStack(this, {
            description: `Site-o-Matic certificate clone sub-stack for ${this.siteProps.rootDomainName}`,
            env: {
              account: certificateClone.account,
              region: certificateClone.region,
            },
          });
          await certificateCloneSubStack.build();
          certificateCloneSubStack.addDependency(certificateSubStack);
          _somTag(certificateCloneSubStack, this.somId);
        }
      }

      // ----------------------------------------------------------------------
      // Web Hosting
      const webHostingSubStack = new SiteWebHostingSubStack(this, {
        description: `Site-o-Matic web hosting sub-stack for ${this.siteProps.rootDomainName}`,
      });
      await webHostingSubStack.build();
      webHostingSubStack.addDependency(certificateSubStack);
      _somTag(webHostingSubStack, this.somId);

      // ----------------------------------------------------------------------
      // Pipeline for the site
      if (this.siteProps.pipeline) {
        const pipelineSubStack = new SitePipelineSubStack(this, {
          description: `Site-o-Matic pipeline sub-stack for ${this.siteProps.rootDomainName}`,
        });
        await pipelineSubStack.build();
        pipelineSubStack.addDependency(webHostingSubStack);
        _somTag(pipelineSubStack, this.somId);
      }

      // ----------------------------------------------------------------------
      // Allow cross account roles to assume domain role
      if (crossAccountAccess.length > 0) {
        this.domainRole = new iam.Role(this, 'DomainRole', {
          assumedBy: new iam.CompositePrincipal(...this.crossAccountGrantRoles) as IPrincipal,
        });
        _somMeta(this.domainRole, this.somId, this.siteProps.protected);
        this.domainRole.attachInlinePolicy(this.domainPolicy);

        const res6 = new ssm.StringParameter(this, 'DomainRoleArn', {
          parameterName: toSsmParamName(this.somId, 'domain-role-arn'),
          stringValue: this.domainRole.roleArn,
          tier: ssm.ParameterTier.STANDARD,
        });
        _somMeta(res6, this.somId, this.siteProps.protected);
      }
    }
  }
}
