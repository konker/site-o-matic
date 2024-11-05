import type * as cdk from 'aws-cdk-lib';

import type { SiteOMaticConfig } from './config/schemas/site-o-matic-config.schema';
import type {
  SOM_STATUS_BREADCRUMB,
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
  SOM_STATUS_HOSTED_ZONE_OK,
  SOM_STATUS_NOT_STARTED,
  SOM_STATUS_SITE_FUNCTIONAL,
} from './consts';
import type { SiteOMaticManifest } from './manifest/schemas/site-o-matic-manifest.schema';
import type { SomFacts } from './rules/site-o-matic.rules';
import type { SecretsSetCollection } from './secrets/types';

export type WwwConnectionStatus = {
  readonly statusCode: number;
  readonly statusMessage: string;
  readonly timing: number;
};

// ----------------------------------------------------------------------
export type HostedZoneAttributes = {
  zoneName: string;
  hostedZoneId: string;
};

// ----------------------------------------------------------------------
export type SiteStackProps = cdk.StackProps & {
  readonly config: SiteOMaticConfig;
  readonly context: HasNetworkDerived<SomContext>;
  readonly facts: SomFacts;
  readonly locked: boolean;
  readonly description: string;
  readonly contextParams: Record<string, string>;
  readonly env: Record<string, string>;
};

/*[XXX]
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
export type PipelineType = typeof SITE_PIPELINE_TYPE_CODESTAR_S3 | typeof SITE_PIPELINE_TYPE_CODESTAR_CUSTOM;

export type PipelineBuilderProps = {
  readonly pipelineType: PipelineType;
  readonly siteResourcesStack: SiteResourcesNestedStack;
};
*/

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
  manifestHash?: string;
  rootDomainName?: string;
  domainHash?: string;
  somId?: string;
  siteUrl?: string;
  webmasterEmail?: string | undefined;
  subdomains?: Array<string>;
  registrar?: string | undefined;

  // Network derived
  params?: Array<SomParam>;
  secrets?: SecretsSetCollection;
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
  readonly manifestHash: string;
  readonly rootDomainName: string;
  readonly domainHash: string;
  readonly somId: string;
  readonly siteUrl: string;
  readonly subdomains: Array<string>;
  readonly registrar: string | undefined;
};

export type HasNetworkDerived<T extends SomContext> = HasManifest<T> & {
  readonly params: Array<SomParam>;
  readonly secrets: SecretsSetCollection;
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
  readonly region: string | undefined;
  readonly subdomains: Array<string> | undefined;
  readonly webHosting: Array<{
    readonly type: string;
    readonly domainName?: string;
    readonly originPath?: string | undefined;
  }>;
  readonly notifications: {
    readonly disabled: boolean;
    readonly noSubscription: boolean;
    readonly subscriptionEmail: string | undefined;
  };
  readonly locked: {
    readonly lockedManifest: boolean;
    readonly lockedSsm: boolean;
  };
  readonly pathToManifestFile: SomParam;
  readonly manifestHash: SomParam;
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
