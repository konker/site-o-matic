import type * as cdk from 'aws-cdk-lib';
import type { ErrorResponse } from 'aws-cdk-lib/aws-cloudfront';

import type { SiteStackProps, SomConfig } from './types';

export const UNKNOWN = 'UNKNOWN';
export const VERSION = '0.0.2';
export const DEFAULT_AWS_REGION = 'us-east-1';
export const DEFAULT_CERTIFICATE_REGION = 'us-east-1';
export const CLS = '\u001b[2J\u001b[0;0H';

export const CONFIG_DEFAULT_SOM_PREFIX = 'som';
export const CONFIG_DEFAULT_SOM_TAG_NAME = 'Site-o-Matic';
export const MAX_SOM_ID_LEN = 48;

export const SSM_PARAM_NAME_SOM_VERSION = 'som-version';
export const SSM_PARAM_NAME_ROOT_DOMAIN_NAME = 'root-domain-name';
export const SSM_PARAM_NAME_DOMAIN_USER_NAME = 'domain-user-name';
export const SSM_PARAM_NAME_DOMAIN_ROLE_ARN = 'domain-role-arn';
export const SSM_PARAM_NAME_WEBMASTER_EMAIL = 'webmaster-email';
export const SSM_PARAM_NAME_PROTECTED_STATUS = 'protected-status';
export const SSM_PARAM_NAME_HOSTED_ZONE_ID = 'hosted-zone-id';
export const SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS = 'hosted-zone-name-servers';
export const SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_NAME = 'notifications-sns-topic-name';
export const SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN = 'notifications-sns-topic-arn';
export const SSM_PARAM_NAME_DOMAIN_BUCKET_NAME = 'domain-bucket-name';
export const SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID = 'cloudfront-distribution-id';
export const SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME = 'cloudfront-domain-name';
export const SSM_PARAM_NAME_CODE_PIPELINE_ARN = 'code-pipeline-arn';
export const SSM_PARAM_NAME_CODE_PIPELINE_NAME = 'code-pipeline-name';
export const SSM_PARAM_NAME_CODE_PIPELINE_CONSOLE_URL = 'code-pipeline-console-url';
export const SSM_PARAM_NAME_CODECOMMIT_CLONE_URL_SSH = 'code-commit-clone-url-ssh';

export const REGISTRAR_ID_AWS_ROUTE53 = 'aws-route53';
export const WEB_HOSTING_TYPE_CLOUDFRONT_S3 = 'cloudfront-s3';

export const WEB_HOSTING_DEFAULT_ORIGIN_PATH = '/www' as const;
export const WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT = 'index.html' as const;
export const WEB_HOSTING_DEFAULT_ERROR_RESPONSES: Array<ErrorResponse> = [
  {
    httpStatus: 404,
    responsePagePath: '/404.html',
  },
];

export const REDIRECT_TYPE_EDGE_CF_FUNCTION = 'edge-cf-function';

export const WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID = 'cf-functions-viewer-request';
export const WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID = 'cf-functions-viewer-request-dir-default';
export const WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID = 'cf-functions-viewer-request-redirect';
export const WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID = 'cf-functions-viewer-response';

export const SITE_PIPELINE_TYPE_CODECOMMIT_S3 = 'codecommit-s3';
export const SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM = 'codecommit-custom';

export const SITE_PIPELINE_TYPE_CODESTAR_S3 = 'codestar-s3';
export const SITE_PIPELINE_TYPE_CODESTAR_CUSTOM = 'codestar-custom';

export const SITE_PIPELINE_TYPES_CODECOMMIT = [SITE_PIPELINE_TYPE_CODECOMMIT_S3, SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM];
export const SITE_PIPELINE_TYPES_CODESTAR = [SITE_PIPELINE_TYPE_CODESTAR_S3, SITE_PIPELINE_TYPE_CODESTAR_CUSTOM];
export const SITE_PIPELINE_TYPES = [...SITE_PIPELINE_TYPES_CODECOMMIT, ...SITE_PIPELINE_TYPES_CODESTAR];

export const SITE_PIPELINE_CODECOMMIT_BRANCH_NAME = 'main';
export const SITE_PIPELINE_CODESTAR_BRANCH_NAME = 'main';

export const DEFAULT_STACK_PROPS = (config: SomConfig, somId: string, siteProps?: SiteStackProps): cdk.StackProps => ({
  env: {
    account: siteProps?.env?.account ?? (process.env.CDK_DEFAULT_ACCOUNT as string),
    region: siteProps?.env?.region ?? (process.env.CDK_DEFAULT_REGION as string),
  },
  tags: { [config.SOM_TAG_NAME]: somId },
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
] as const;
