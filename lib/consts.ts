import type * as cdk from 'aws-cdk-lib';

import type { SiteStackProps } from './types';

export const VERSION = '0.0.1';
export const DEFAULT_AWS_REGION = 'us-east-1';
export const DEFAULT_CERTIFICATE_REGION = 'us-east-1';
export const CLS = '\u001b[2J\u001b[0;0H';

export const SOM_PREFIX = 'som';
export const SOM_TAG_NAME = 'Site-o-Matic';
export const MAX_SOM_ID_LEN = 48;

export const SSM_PARAM_NAME_DOMAIN_USER_NAME = 'domain-user-name';
export const SSM_PARAM_NAME_HOSTED_ZONE_ID = 'hosted-zone-id';
export const SSM_PARAM_NAME_PROTECTED_STATUS = 'protected-status';
export const SSM_PARAM_NAME_SOM_VERSION = 'som-version';

export const SITE_PIPELINE_TYPE_CODECOMMIT_S3 = 'codecommit-s3';
export const SITE_PIPELINE_TYPE_CODECOMMIT_NPM = 'codecommit-npm';

export const DEFAULT_STACK_PROPS = (somId: string, siteProps?: SiteStackProps): cdk.StackProps => ({
  env: {
    account: siteProps?.env?.account ?? (process.env.CDK_DEFAULT_ACCOUNT as string),
    region: siteProps?.env?.region ?? (process.env.CDK_DEFAULT_REGION as string),
  },
  tags: { [SOM_TAG_NAME]: somId },
});

export const SOM_STAGE_DNS = 'SOM_STAGE_DNS';
export const SOM_STAGE_NAMESERVERS_SET = 'SOM_STAGE_NAMESERVERS_SET';
export const SOM_STAGE_CERTIFCATES = 'SOM_STAGE_CERTIFCATES';
export const SOM_STAGE_WEB_HOSTING = 'SOM_STAGE_WEB_HOSTING';
export const SOM_STAGE_PIPELINE = 'SOM_STAGE_PIPELINE';

export type SomStage =
  | typeof SOM_STAGE_DNS
  | typeof SOM_STAGE_NAMESERVERS_SET
  | typeof SOM_STAGE_CERTIFCATES
  | typeof SOM_STAGE_WEB_HOSTING
  | typeof SOM_STAGE_PIPELINE;

export const SOM_STAGES: Array<SomStage> = [
  SOM_STAGE_DNS,
  SOM_STAGE_NAMESERVERS_SET,
  SOM_STAGE_CERTIFCATES,
  SOM_STAGE_WEB_HOSTING,
  SOM_STAGE_PIPELINE,
];

export const SOM_STATUS_NOT_STARTED = 'NotStarted';
export const SOM_STATUS_HOSTED_ZONE_DEPLOYMENT_IN_PROGRESS = 'HostedZoneDeploymentInProgress';
export const SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG = 'HostedZoneAwaitingNameserverConfig';
export const SOM_STATUS_HOSTED_ZONE_OK = 'HostedZoneOk';
export const SOM_STATUS_HOSTING_DEPLOYMENT_IN_PROGRESS = 'HostingDeploymentInProgress';
export const SOM_STATUS_HOSTING_DEPLOYED = 'HostingDeployed';
export const SOM_STATUS_PIPELINE_DEPLOYMENT_IN_PROGRESS = 'PipelineDeploymentInProgress';
export const SOM_STATUS_PIPELINE_DEPLOYED = 'PipelineDeployed';
export const SOM_STATUS_SITE_FUNCTIONAL = 'SiteFunctional';

export type SomStatus =
  | typeof SOM_STATUS_NOT_STARTED
  | typeof SOM_STATUS_HOSTED_ZONE_DEPLOYMENT_IN_PROGRESS
  | typeof SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG
  | typeof SOM_STATUS_HOSTED_ZONE_OK
  | typeof SOM_STATUS_HOSTING_DEPLOYMENT_IN_PROGRESS
  | typeof SOM_STATUS_HOSTING_DEPLOYED
  | typeof SOM_STATUS_PIPELINE_DEPLOYMENT_IN_PROGRESS
  | typeof SOM_STATUS_PIPELINE_DEPLOYED
  | typeof SOM_STATUS_SITE_FUNCTIONAL;

export type SomParam = Record<string, string>;

export type SomState = {
  spinner: any;
  rootDomain?: string | undefined;
  subdomains?: Array<string> | undefined;
  certificateCloneNames?: Array<string> | undefined;
  crossAccountAccessNames?: Array<string> | undefined;
  siteUrl?: string | undefined;
  somId?: string | undefined;
  registrar?: string | undefined;
  registrarNameservers?: Array<string> | undefined;
  pathToManifestFile?: string | undefined;
  manifest?: any | undefined;
  params?: Array<SomParam> | undefined;
  status?: SomStatus | undefined;
  verificationTxtRecordViaDns?: string | undefined;
  protectedManifest?: string | undefined;
  protectedSsm?: string | undefined;
};

export type SomConfig = {
  readonly SOM_PREFIX: string;
  readonly SOM_TAG_NAME: string;
  readonly SOM_ROLE_ARN: string;
};
