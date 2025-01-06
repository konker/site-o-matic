import path from 'path';

import { CONTENT_PRODUCER_ID_DEFAULT } from './content';

export const SOM = 'site-o-matic';
export const UNKNOWN = 'UNKNOWN' as const;
export const VERSION = '0.0.4' as const;
export const DEFAULT_CERTIFICATE_REGION = 'us-east-1' as const;
export const CLS = '\u001b[2J\u001b[0;0H' as const;
export const SOM_ROOT_PATH = path.join(__dirname, '..');

export const CDK_COMMAND_NOTHING = 'nothing' as const;

export const SOM_CONFIG_DEFAULT_FILE_NAME = 'site-o-matic.config.json5' as const;
export const SOM_CONFIG_PATH_TO_DEFAULT_FILE = path.join(SOM_ROOT_PATH, SOM_CONFIG_DEFAULT_FILE_NAME);

export const SOM_CONFIG_DEFAULT_SOM_PREFIX = 'som' as const;
export const SOM_CONFIG_DEFAULT_SOM_TAG_NAME = 'Site-o-Matic' as const;
export const MAX_SOM_ID_LEN = 48 as const;

export const SECRETS_SCOPE_GLOBAL = 'global';
export const SECRETS_SCOPE_SITE = 'site';

export const ONE_MINUTE_IN_SECS = 60 * 60;
export const ONE_HOUR_IN_SECS = ONE_MINUTE_IN_SECS * 60;
export const ONE_DAY_IN_SECS = ONE_HOUR_IN_SECS * 24;

export const SSM_PARAM_PATH_ROOT_DOMAIN_NAME = '/som/site/root-domain-name';

export const SSM_PARAM_NAME_SOM_VERSION = 'som-version' as const;
export const SSM_PARAM_NAME_ROOT_DOMAIN_NAME = 'root-domain-name' as const;
export const SSM_PARAM_NAME_DOMAIN_USER_USER_NAME = 'domain-user-name' as const;
export const SSM_PARAM_NAME_DOMAIN_PUBLISHER_USER_NAME = 'domain-publisher-user-name' as const;
export const SSM_PARAM_NAME_WEBMASTER_EMAIL = 'webmaster-email' as const;
export const SSM_PARAM_NAME_PROTECTED_STATUS = 'protected-status' as const;
export const SSM_PARAM_NAME_HOSTED_ZONE_ID = 'hosted-zone-id' as const;
export const SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS = 'hosted-zone-name-servers' as const;
export const SSM_PARAM_NAME_IS_AWS_ROUTE53_REGISTERED_DOMAIN = 'is-aws-route53-registered-domain' as const;
export const SSM_PARAM_NAME_DOMAIN_CERTIFICATE_ARN = 'domain-certificate-arn' as const;
export const SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_NAME = 'notifications-sns-topic-name' as const;
export const SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN = 'notifications-sns-topic-arn' as const;
export const SSM_PARAM_NAME_DOMAIN_BUCKET_NAME = 'domain-bucket-name' as const;
export const SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID = 'cloudfront-distribution-id' as const;
export const SSM_PARAM_NAME_CLOUDFRONT_DOMAIN_NAME = 'cloudfront-domain-name' as const;
export const SSM_PARAM_NAME_CLOUDFRONT_KEY_VALUE_STORE_NAME = 'cloudfront-key-value-store-name' as const;
export const SSM_PARAM_NAME_CLOUDFRONT_KEY_VALUE_STORE_ARN = 'cloudfront-key-value-store-arn' as const;

export const REGISTRAR_ID_AWS_ROUTE53 = 'aws-route53' as const;
export const WEB_HOSTING_TYPE_CLOUDFRONT_S3 = 'cloudfront-s3' as const;
export const WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS = 'cloudfront-https' as const;
export const WEB_HOSTING_TYPE_NONE = 'none' as const;

export const REDIRECT_IMPL_EDGE_CF_FUNCTION = 'edge-cf-function' as const;

export const AUTH_TYPE_BASIC_AUTH = 'basic-auth' as const;
export const AUTH_IMPL_EDGE_CF_FUNCTION = 'edge-cf-function' as const;

export const WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID = 'cf-fns-viewer-request';
export const WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID = 'cf-fns-viewer-request-dir-default';
export const WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID = 'cf-fns-viewer-request-redirect';
export const WEB_HOSTING_VIEWER_REQUEST_BASIC_AUTH_FUNCTION_PRODUCER_ID = 'cf-fns-viewer-request-basic-auth';
export const WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID = 'cf-fns-viewer-response';
export const WEB_HOSTING_VIEWER_RESPONSE_CSP_HASHES_FUNCTION_PRODUCER_ID = 'cf-fns-viewer-response-csp-hashes';

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

export const DEFAULT_CONTENT_CLAUSE = {
  producerId: CONTENT_PRODUCER_ID_DEFAULT,
} as const;

export const WEB_HOSTING_TYPE_CLOUDFRONT_S3_DEFAULT_ORIGIN_PATH = '/www' as const;
export const WEB_HOSTING_TYPE_CLOUDFRONT_S3_DEFAULT_DEFAULT_ROOT_OBJECT = 'index.html' as const;

export const WEB_HOSTING_TYPE_CLOUDFRONT_S3_DEFAULTS_DEFAULT = {
  // The default file that will be served when a directory is requested
  defaultRootObject: 'index.html',
  originPath: WEB_HOSTING_TYPE_CLOUDFRONT_S3_DEFAULT_ORIGIN_PATH,
  content: DEFAULT_CONTENT_CLAUSE,
  keyValueStore: false,

  // A mapping to custom files for HTTP error situations
  errorResponses: [
    { httpStatus: 403, responsePagePath: '/403.html' },
    { httpStatus: 404, responsePagePath: '/404.html' },
  ],
};

export const WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS_DEFAULT_ORIGIN_PATH = '' as const;
export const WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS_DEFAULTS_DEFAULT = {
  originPath: WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS_DEFAULT_ORIGIN_PATH,
} as const;

export const WEB_HOSTING_TYPE_NONE_DEFAULTS_DEFAULT = {} as const;

export const WEB_HOSTING_DEFAULTS_DEFAULT = {
  [WEB_HOSTING_TYPE_CLOUDFRONT_S3]: WEB_HOSTING_TYPE_CLOUDFRONT_S3_DEFAULTS_DEFAULT,
  [WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS]: WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS_DEFAULTS_DEFAULT,
  [WEB_HOSTING_TYPE_NONE]: WEB_HOSTING_TYPE_NONE_DEFAULTS_DEFAULT,
} as const;

export const WEB_HOSTING_DEFAULT = (domainName: string) =>
  ({
    type: WEB_HOSTING_TYPE_CLOUDFRONT_S3,
    domainName: domainName,
  }) as const;

export const SECURE_STRING_FLAG = true;
