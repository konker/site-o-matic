import type * as cdk from 'aws-cdk-lib';
import type * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import type { ErrorResponse } from 'aws-cdk-lib/aws-cloudfront';
import type * as codebuild from 'aws-cdk-lib/aws-codebuild';
import type * as codecommit from 'aws-cdk-lib/aws-codecommit';
import type * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import type * as route53 from 'aws-cdk-lib/aws-route53';
import type * as s3 from 'aws-cdk-lib/aws-s3';

import type { SiteStack } from '../system/aws/defs/siteomatic/site/SiteStack';
import type {
  SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM,
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
  SITE_PIPELINE_TYPE_CODESTAR_CUSTOM,
  SITE_PIPELINE_TYPE_CODESTAR_S3,
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
  SOM_STATUS_HOSTED_ZONE_OK,
  SOM_STATUS_NOT_STARTED,
  SOM_STATUS_SITE_FUNCTIONAL,
  WEB_HOSTING_TYPE_CLOUDFRONT_S3,
} from './consts';

export type WwwConnectionStatus = {
  readonly statusCode: number;
  readonly statusMessage: string;
  readonly timing: number;
};

// ----------------------------------------------------------------------
export type DnsConfigMx = {
  readonly type: 'MX';
  readonly hostName: string;
  readonly priority: number;
};

export type DnsConfigCname = {
  readonly type: 'CNAME';
  readonly recordName: string;
  readonly domainName: string;
};

export type DnsConfigTxt = {
  readonly type: 'TXT';
  readonly recordName: string;
  readonly values: Array<string>;
};

export type HostedZoneDnsConfig = DnsConfigMx | DnsConfigCname | DnsConfigTxt;

export type HostedZoneConfig = {
  readonly domainName: string;
  readonly extraDnsConfig?: Array<HostedZoneDnsConfig> | undefined;
};
// ----------------------------------------------------------------------
export type HostedZoneResources = {
  readonly hostedZone: route53.PublicHostedZone;
};

export type CertificateResources = {
  readonly domainCertificate: certificatemanager.ICertificate;
};

export type WebHostingResources = {
  readonly domainBucket: s3.Bucket;
  readonly originAccessIdentity: cloudfront.OriginAccessIdentity;
  readonly cloudFrontDistribution: cloudfront.Distribution;
};

export type PipelineBuildPhase = {
  readonly commands: Array<string>;
};
export type BaseSitePipelineResources = {
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
};
export type BaseCodeCommitSitePipelineResources = BaseSitePipelineResources & {
  readonly codeCommitRepo: codecommit.Repository;
};
export type CodeCommitS3SitePipelineResources = BaseCodeCommitSitePipelineResources & {
  readonly type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3;
  readonly codePipeline: codepipeline.Pipeline;
};
export type CodeCommitCustomSitePipelineResources = BaseCodeCommitSitePipelineResources & {
  readonly type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM;
  readonly codePipeline: codepipeline.Pipeline;
};

export type CodeStarS3SitePipelineResources = BaseSitePipelineResources & {
  readonly type: typeof SITE_PIPELINE_TYPE_CODESTAR_S3;
  readonly codestarConnectionArn: string;
  readonly owner: string;
  readonly repo: string;
  readonly codePipeline: codepipeline.Pipeline;
};
export type CodeStarCustomSitePipelineResources = BaseSitePipelineResources & {
  readonly type: typeof SITE_PIPELINE_TYPE_CODESTAR_CUSTOM;
  readonly codestarConnectionArn: string;
  readonly owner: string;
  readonly repo: string;
  readonly codePipeline: codepipeline.Pipeline;
};

export type PipelineResources =
  | CodeCommitS3SitePipelineResources
  | CodeCommitCustomSitePipelineResources
  | CodeStarS3SitePipelineResources
  | CodeStarCustomSitePipelineResources;

// ----------------------------------------------------------------------
export type HostedZoneBuilderProps = {
  readonly siteStack: SiteStack;
  readonly domainName: string;
  readonly extraDnsConfig: Array<HostedZoneDnsConfig>;
  readonly subdomains?: Array<HostedZoneConfig> | undefined;
};

// ----------------------------------------------------------------------
export type CertificateCloneSpec = {
  readonly name: string;
  readonly account: string;
  readonly region: string;
};

export type CrossAccountAccessGrantRoleSpec = {
  readonly name: string;
  readonly arn: string;
};

export type WafAwsManagedRule = {
  readonly name: string;
  readonly priority: number;
};

// ----------------------------------------------------------------------
export type SomManifest = {
  readonly title: string;
  readonly webmasterEmail: string;
  readonly protected: boolean;
  readonly registrar?: string | undefined;
  readonly dns: HostedZoneConfig & {
    readonly subdomains?: undefined | Array<HostedZoneConfig>;
  };
  readonly certificate?:
    | undefined
    | {
        readonly create?: boolean;
        readonly clones?: Array<CertificateCloneSpec>;
      };
  readonly webHosting?:
    | undefined
    | {
        readonly type: typeof WEB_HOSTING_TYPE_CLOUDFRONT_S3;
        readonly originPath?: string;
        readonly defaultRootObject?: string;
        readonly errorResponses?: Array<ErrorResponse>;
        readonly waf?: {
          readonly enabled: boolean;
          readonly AWSManagedRules?: Array<WafAwsManagedRule> | undefined;
        };
      };
  readonly pipeline?:
    | undefined
    | {
        readonly type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3;
      }
    | {
        readonly type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM;
        readonly buildPhases: Record<string, PipelineBuildPhase>;
      }
    | {
        readonly type: typeof SITE_PIPELINE_TYPE_CODESTAR_S3;
        readonly codestarConnectionArn: string;
        readonly owner: string;
        readonly repo: string;
      }
    | {
        readonly type: typeof SITE_PIPELINE_TYPE_CODESTAR_CUSTOM;
        readonly codestarConnectionArn: string;
        readonly owner: string;
        readonly repo: string;
        readonly buildPhases: Record<string, PipelineBuildPhase>;
      };
  readonly content?:
    | undefined
    | {
        readonly producerId: string;
      };
  readonly crossAccountAccess?: undefined | Array<CrossAccountAccessGrantRoleSpec>;
};

// ----------------------------------------------------------------------
export type SiteStackProps = cdk.StackProps &
  SomManifest & {
    readonly description: string;
    readonly username: string;
    readonly contextParams: Record<string, string>;
    readonly siteContentTmpDirPath?: string | undefined;
    readonly env?: Record<string, string>;
  };

export type SiteNestedStackProps = cdk.StackProps & {
  readonly description: string;
  readonly env?: Record<string, string>;
};

// ----------------------------------------------------------------------
export type CertificateBuilderProps = {
  readonly siteStack: SiteStack;
  readonly region: string;
  readonly domainName: string;
  readonly hostedZoneId: string;
  readonly subdomains: Array<HostedZoneConfig>;
};

// ----------------------------------------------------------------------
export type WebHostingBuilderProps = {
  readonly siteStack: SiteStack;
  readonly domainCertificate: certificatemanager.ICertificate;
};

// ----------------------------------------------------------------------
export type PipelineType =
  | typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3
  | typeof SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM
  | typeof SITE_PIPELINE_TYPE_CODESTAR_S3
  | typeof SITE_PIPELINE_TYPE_CODESTAR_CUSTOM;

export type PipelineBuilderProps = {
  readonly pipelineType: PipelineType;
  readonly siteStack: SiteStack;
};

// ----------------------------------------------------------------------
export type SomStatus =
  | typeof SOM_STATUS_NOT_STARTED
  | typeof SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG
  | typeof SOM_STATUS_HOSTED_ZONE_OK
  | typeof SOM_STATUS_SITE_FUNCTIONAL;

export type SomParam = Record<string, string>;

export type SomState = {
  spinner: any;
  somVersion: string;
  rootDomain?: string | undefined;
  subdomains?: Array<string> | undefined;
  certificateCreate?: boolean;
  certificateCloneNames?: Array<string> | undefined;
  crossAccountAccessNames?: Array<string> | undefined;
  siteUrl?: string | undefined;
  somId?: string | undefined;
  domainHash?: string | undefined;
  registrar?: string | undefined;
  registrarNameservers?: Array<string> | undefined;
  pathToManifestFile?: string | undefined;
  manifest?: any | undefined;
  params?: Array<SomParam> | undefined;
  status?: SomStatus | undefined;
  statusMessage?: string | undefined;
  verificationTxtRecordViaDns?: string | undefined;
  protectedManifest?: string | undefined;
  protectedSsm?: string | undefined;
  connectionStatus?: WwwConnectionStatus | undefined;
  nameserversSet?: boolean | undefined;
  hostedZoneVerified?: boolean | undefined;
};

export type SomConfig = {
  readonly SOM_PREFIX: string;
  readonly SOM_TAG_NAME: string;
  readonly SOM_ROLE_ARN: string;
};
