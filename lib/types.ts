import type * as cdk from 'aws-cdk-lib';
import type * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import type * as codebuild from 'aws-cdk-lib/aws-codebuild';
import type * as codecommit from 'aws-cdk-lib/aws-codecommit';
import type * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import type * as route53 from 'aws-cdk-lib/aws-route53';
import type * as s3 from 'aws-cdk-lib/aws-s3';

import type { SiteStack } from '../system/aws/defs/siteomatic/site/SiteStack';
import type { SITE_PIPELINE_TYPE_CODECOMMIT_NPM, SITE_PIPELINE_TYPE_CODECOMMIT_S3 } from './consts';

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

export type BaseSitePipelineResources = {
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
};

export type BaseCodecommitSitePipelineResources = {
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  readonly codeCommitRepo: codecommit.Repository;
};

export type CodecommitS3SitePipelineResources = {
  readonly type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3;
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  readonly codeCommitRepo: codecommit.Repository;
  readonly codePipeline: codepipeline.Pipeline;
};

export type CodecommitNpmSitePipelineResources = {
  readonly type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_NPM;
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  readonly codeCommitRepo: codecommit.Repository;
  readonly codePipeline: codepipeline.Pipeline;
};

export type PipelineResources = CodecommitS3SitePipelineResources | CodecommitNpmSitePipelineResources;

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

// ----------------------------------------------------------------------
export type SomManifest = {
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
        readonly type: string;
      };
  readonly pipeline?:
    | undefined
    | {
        readonly type: string;
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
    readonly siteContentTmpZipFilePath?: string | undefined;
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
export type PipelineType = typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3 | typeof SITE_PIPELINE_TYPE_CODECOMMIT_NPM;

export type PipelineBuilderProps = {
  readonly siteStack: SiteStack;
  readonly pipelineType: PipelineType;
};
