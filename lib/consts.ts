import type * as cdk from 'aws-cdk-lib';
import path from 'path';

import type { SiteOMaticConfig } from './config/schemas/site-o-matic-config.schema';
import type { WebHostingErrorResponse } from './manifest/schemas/site-o-matic-manifest.schema';
import type { SiteStackProps } from './types';

export const UNKNOWN = 'UNKNOWN' as const;
export const VERSION = '0.0.2' as const;
export const DEFAULT_AWS_REGION = 'us-east-1' as const;
export const DEFAULT_CERTIFICATE_REGION = 'us-east-1' as const;
export const CLS = '\u001b[2J\u001b[0;0H' as const;
export const SOM_ROOT_PATH = path.join(__dirname, '..');

export const SOM_CONFIG_DEFAULT_FILE_NAME = 'site-o-matic.config.json5' as const;
export const SOM_CONFIG_PATH_TO_DEFAULT_FILE = path.join(SOM_ROOT_PATH, SOM_CONFIG_DEFAULT_FILE_NAME);

export const SOM_CONFIG_DEFAULT_SOM_PREFIX = 'som' as const;
export const SOM_CONFIG_DEFAULT_SOM_TAG_NAME = 'Site-o-Matic' as const;
export const MAX_SOM_ID_LEN = 48 as const;

export const SSM_PARAM_NAME_SOM_VERSION = 'som-version' as const;
export const SSM_PARAM_NAME_ROOT_DOMAIN_NAME = 'root-domain-name' as const;
export const SSM_PARAM_NAME_DOMAIN_USER_NAME = 'domain-user-name' as const;
export const SSM_PARAM_NAME_DOMAIN_ROLE_ARN = 'domain-role-arn' as const;
export const SSM_PARAM_NAME_WEBMASTER_EMAIL = 'webmaster-email' as const;
export const SSM_PARAM_NAME_PROTECTED_STATUS = 'protected-status' as const;
export const SSM_PARAM_NAME_HOSTED_ZONE_ID = 'hosted-zone-id' as const;
export const SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS = 'hosted-zone-name-servers' as const;
export const SSM_PARAM_NAME_DOMAIN_CERTIFICATE_ARN = 'domain-certificate-arn' as const;
export const SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_NAME = 'notifications-sns-topic-name' as const;
export const SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN = 'notifications-sns-topic-arn' as const;
export const SSM_PARAM_NAME_DOMAIN_BUCKET_NAME = 'domain-bucket-name' as const;
export const SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID = 'cloudfront-distribution-id' as const;
export const SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME = 'cloudfront-domain-name' as const;
export const SSM_PARAM_NAME_CODE_PIPELINE_ARN = 'code-pipeline-arn' as const;
export const SSM_PARAM_NAME_CODE_PIPELINE_NAME = 'code-pipeline-name' as const;
export const SSM_PARAM_NAME_CODE_PIPELINE_CONSOLE_URL = 'code-pipeline-console-url' as const;
export const SSM_PARAM_NAME_CODECOMMIT_CLONE_URL_SSH = 'code-commit-clone-url-ssh' as const;

export const REGISTRAR_ID_AWS_ROUTE53 = 'aws-route53' as const;
export const WEB_HOSTING_TYPE_CLOUDFRONT_S3 = 'cloudfront-s3' as const;
export const WEB_HOSTING_TYPE_NONE = 'none' as const;

export const WEB_HOSTING_DEFAULT_ORIGIN_PATH = '/www' as const;
export const WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT = 'index.html' as const;
export const WEB_HOSTING_DEFAULT_ERROR_RESPONSES: Array<WebHostingErrorResponse> = [
  {
    httpStatus: 404,
    responsePagePath: '/404.html',
  },
] as const;

export const REDIRECT_TYPE_EDGE_CF_FUNCTION = 'edge-cf-function' as const;

export const WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID = 'cf-functions-viewer-request';
export const WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID = 'cf-functions-viewer-request-dir-default';
export const WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID = 'cf-functions-viewer-request-redirect';
export const WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID = 'cf-functions-viewer-response';

export const SITE_PIPELINE_TYPE_CODECOMMIT_S3 = 'codecommit-s3' as const;
export const SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM = 'codecommit-custom' as const;

export const SITE_PIPELINE_TYPE_CODESTAR_S3 = 'codestar-s3' as const;
export const SITE_PIPELINE_TYPE_CODESTAR_CUSTOM = 'codestar-custom' as const;

export const SITE_PIPELINE_TYPES_CODECOMMIT = [
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
  SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM,
] as const;
export const SITE_PIPELINE_TYPES_CODESTAR = [
  SITE_PIPELINE_TYPE_CODESTAR_S3,
  SITE_PIPELINE_TYPE_CODESTAR_CUSTOM,
] as const;
export const SITE_PIPELINE_TYPES = [...SITE_PIPELINE_TYPES_CODECOMMIT, ...SITE_PIPELINE_TYPES_CODESTAR] as const;

export const SITE_PIPELINE_CODECOMMIT_BRANCH_NAME = 'main' as const;
export const SITE_PIPELINE_CODESTAR_BRANCH_NAME = 'main' as const;

export const SITE_PIPELINE_DEFAULT_BUILD_IMAGE = 'aws/codebuild/standard:7.0' as const;
export const SITE_PIPELINE_DEFAULT_BUILD_FILES = ['**/*'] as const;

export const DEFAULT_STACK_PROPS = (
  config: SiteOMaticConfig,
  somId: string,
  siteProps?: SiteStackProps
): cdk.StackProps => ({
  env: {
    account: siteProps?.env?.account ?? (process.env.CDK_DEFAULT_ACCOUNT as string),
    region: siteProps?.env?.region ?? (process.env.CDK_DEFAULT_REGION as string),
  },
  tags: { [config.SOM_TAG_NAME]: somId },
});

export const SERVICE_TYPE_REST_API = 'rest-api' as const;

export const SOM_STATUS_NOT_STARTED = 'NotStarted' as const;
export const SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG = 'HostedZoneAwaitingNameserverConfig' as const;
export const SOM_STATUS_HOSTED_ZONE_OK = 'HostedZoneOk' as const;
export const SOM_STATUS_SITE_FUNCTIONAL = 'SiteFunctional' as const;

export const SOM_STATUS_BREADCRUMB = [
  SOM_STATUS_NOT_STARTED,
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
  SOM_STATUS_HOSTED_ZONE_OK,
  SOM_STATUS_SITE_FUNCTIONAL,
] as const;
