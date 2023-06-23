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

export const SITE_PIPELINE_TYPE_CODESTAR_S3 = 'codestar-s3';
export const SITE_PIPELINE_TYPE_CODESTAR_NPM = 'codestar-npm';

export const SITE_PIPELINE_TYPES_CODECOMMIT = [SITE_PIPELINE_TYPE_CODECOMMIT_S3, SITE_PIPELINE_TYPE_CODECOMMIT_NPM];
export const SITE_PIPELINE_TYPES_CODESTAR = [SITE_PIPELINE_TYPE_CODESTAR_S3, SITE_PIPELINE_TYPE_CODESTAR_NPM];
export const SITE_PIPELINE_TYPES = [...SITE_PIPELINE_TYPES_CODECOMMIT, ...SITE_PIPELINE_TYPES_CODESTAR];

export const SITE_PIPELINE_CODECOMMIT_BRANCH_NAME = 'main';
export const SITE_PIPELINE_CODESTAR_BRANCH_NAME = 'main';

export const DEFAULT_STACK_PROPS = (somId: string, siteProps?: SiteStackProps): cdk.StackProps => ({
  env: {
    account: siteProps?.env?.account ?? (process.env.CDK_DEFAULT_ACCOUNT as string),
    region: siteProps?.env?.region ?? (process.env.CDK_DEFAULT_REGION as string),
  },
  tags: { [SOM_TAG_NAME]: somId },
});

export const SOM_STATUS_NOT_STARTED = 'NotStarted';
export const SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG = 'HostedZoneAwaitingNameserverConfig';
export const SOM_STATUS_HOSTED_ZONE_OK = 'HostedZoneOk';
export const SOM_STATUS_SITE_FUNCTIONAL = 'SiteFunctional';

export const SOM_STATUS_BREADCRUMB = [
  SOM_STATUS_NOT_STARTED,
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
  SOM_STATUS_HOSTED_ZONE_OK,
  SOM_STATUS_SITE_FUNCTIONAL,
];
