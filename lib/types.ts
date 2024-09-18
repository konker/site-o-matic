import type * as cdk from 'aws-cdk-lib';
import type * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import type * as codebuild from 'aws-cdk-lib/aws-codebuild';
import type * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import type * as route53 from 'aws-cdk-lib/aws-route53';
import type * as s3 from 'aws-cdk-lib/aws-s3';

import type { SiteStack } from '../system/aws/defs/siteomatic/site/SiteStack';
import type { SiteOMaticConfig } from './config/schemas/site-o-matic-config.schema';
import type {
  SERVICE_TYPE_REST_API,
  SITE_PIPELINE_TYPE_CODESTAR_CUSTOM,
  SITE_PIPELINE_TYPE_CODESTAR_S3,
  SOM_STATUS_BREADCRUMB,
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
  SOM_STATUS_HOSTED_ZONE_OK,
  SOM_STATUS_NOT_STARTED,
  SOM_STATUS_SITE_FUNCTIONAL,
} from './consts';
import type {
  PipelineClause,
  RestApiServiceSpec,
  SiteOMaticManifest,
  WebHostingClause,
} from './manifest/schemas/site-o-matic-manifest.schema';
import type { SomFacts } from './rules/site-o-matic.rules';

export type WwwConnectionStatus = {
  readonly statusCode: number;
  readonly statusMessage: string;
  readonly timing: number;
};

// ----------------------------------------------------------------------
export type HostedZoneResources = {
  readonly hostedZone: route53.IHostedZone;
};

export type HostedZoneAttributes = {
  zoneName: string;
  hostedZoneId: string;
};

export type CertificateResources = {
  readonly domainName: string;
  readonly domainCertificate: certificatemanager.ICertificate;
  readonly subdomainResources: Array<CertificateResources>;
};

export type WebHostingResources = {
  readonly domainBucket: s3.Bucket;
  readonly originAccessControl: cloudfront.CfnOriginAccessControl;
  readonly cloudFrontDistribution: cloudfront.Distribution;
};

export type RestApiServiceResources = {
  readonly type: typeof SERVICE_TYPE_REST_API;
  readonly service: RestApiServiceSpec;
  readonly originAccessIdentity: cloudfront.OriginAccessIdentity;
  readonly cloudFrontDistribution: cloudfront.Distribution;
};

// Maybe add some others in the future
// ...

export type ServiceResources = RestApiServiceResources;

// ----------------------------------------------------------------------
export type HostedZoneBuilderProps = {
  readonly siteStack: SiteStack;
  readonly rootDomainName: string;
};

// ----------------------------------------------------------------------
export type BaseSitePipelineResources = {
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
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

export type PipelineResources = CodeStarS3SitePipelineResources | CodeStarCustomSitePipelineResources;

// ----------------------------------------------------------------------
export type SiteStackProps = cdk.StackProps & {
  readonly config: SiteOMaticConfig;
  readonly context: HasNetworkDerived<SomContext>;
  readonly facts: SomFacts;
  readonly protected: boolean;
  readonly description: string;
  readonly username: string;
  readonly contextParams: Record<string, string>;
  readonly cfFunctionViewerRequestTmpFilePath: [string, string | undefined];
  readonly cfFunctionViewerResponseTmpFilePath: [string, string | undefined];
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
  readonly rootDomainName: string;
  readonly hostedZoneId: string;
};

// ----------------------------------------------------------------------
export type WebHostingBuilderProps = {
  readonly siteStack: SiteStack;
  readonly domainCertificate: certificatemanager.ICertificate;
  readonly cfFunctionViewerRequestTmpFilePath: [string, string | undefined];
  readonly cfFunctionViewerResponseTmpFilePath: [string, string | undefined];
};

// ----------------------------------------------------------------------
export type RestApiServiceBuilderProps = {
  readonly siteStack: SiteStack;
  readonly service: RestApiServiceSpec;
};

// ----------------------------------------------------------------------
export type PipelineType = typeof SITE_PIPELINE_TYPE_CODESTAR_S3 | typeof SITE_PIPELINE_TYPE_CODESTAR_CUSTOM;

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

export type SomParam = {
  readonly Param: string;
  readonly Value: string;
};

export type SomContext = {
  // Manifest derived
  pathToManifestFile?: string;
  manifest?: SiteOMaticManifest;
  rootDomainName?: string;
  domainHash?: string;
  somId?: string;
  siteUrl?: string;
  webmasterEmail?: string | undefined;
  subdomains?: Array<string>;
  registrar?: string | undefined;

  // Network derived
  params?: Array<SomParam>;
  hostedZoneAttributes?: HostedZoneAttributes | undefined;
  hostedZoneNameservers?: Array<string>;
  registrarNameservers?: Array<string>;
  dnsResolvedNameserverRecords?: Array<string>;
  dnsVerificationTxtRecord?: string | undefined;
  certificateStatus?: boolean;
  connectionStatus?: WwwConnectionStatus;
  isS3BucketEmpty?: boolean;

  // Rest of context derived
  somVersion: string;
};

export type HasManifest<T extends SomContext> = T & {
  readonly pathToManifestFile: string;
  readonly manifest: SiteOMaticManifest;
  readonly rootDomainName: string;
  readonly domainHash: string;
  readonly somId: string;
  readonly siteUrl: string;
  readonly subdomains: Array<string>;
  readonly registrar: string | undefined;
};

export type HasNetworkDerived<T extends SomContext> = HasManifest<T> & {
  readonly params: Array<SomParam>;
  readonly hostedZoneAttributes: HostedZoneAttributes | undefined;
  readonly hostedZoneNameservers: Array<string>;
  readonly registrarNameservers: Array<string>;
  readonly dnsResolvedNameserverRecords: Array<string>;
  readonly dnsVerificationTxtRecord: string | undefined;
  readonly connectionStatus: WwwConnectionStatus;
  readonly isS3BucketEmpty: boolean;
};

export type SomInfoSpec = {
  readonly siteUrl: string;
  readonly webmasterEmail: string | undefined;
  readonly registrar: string | undefined;
  readonly subdomains: Array<string> | undefined;
  readonly webHosting:
    | (Required<Omit<WebHostingClause, 'errorResponses' | 'waf'>> & {
        errorResponses: Array<string>;
        waf:
          | {
              enabled: boolean;
              AWSManagedRules: Array<string>;
            }
          | undefined;
      })
    | undefined;
  readonly content: string | undefined;
  readonly pipeline: PipelineClause | undefined;
  readonly redirect:
    | {
        readonly type: string;
        readonly action: string;
      }
    | undefined;
  readonly services: Array<[string, string]>;
  readonly certificateClones: Array<string> | undefined;
  readonly crossAccountAccessNames: Array<string> | undefined;
  readonly notifications: {
    readonly disabled: boolean;
    readonly noSubscription: boolean;
    readonly subscriptionEmail: string | undefined;
  };
  readonly protected: {
    readonly protectedManifest: boolean;
    readonly protectedSsm: boolean;
  };
  readonly pathToManifestFile: SomParam;
  readonly somId: SomParam;
};

export type SomInfoStatus = {
  readonly somVersion: {
    somVersionSystem: string;
    somVersionSite: string;
  };
  readonly status: {
    readonly status: SomStatus;
    readonly statusMessage: string;
    readonly breadcrumb: typeof SOM_STATUS_BREADCRUMB;
  };
  readonly connectionStatus:
    | {
        readonly statusCode: number;
        readonly statusMessage: string;
        readonly timing: number;
      }
    | undefined;
  readonly hostedZoneVerified: boolean;
  readonly verificationTxtRecordViaDns: string | undefined;
  readonly nameserversSet: boolean;
  readonly registrarNameservers: Array<string> | undefined;
  readonly params: Array<SomParam>;
};
