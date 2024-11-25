import * as z from 'zod';

import {
  AUTH_IMPL_EDGE_CF_FUNCTION,
  AUTH_TYPE_BASIC_AUTH,
  DEFAULT_CERTIFICATE_REGION,
  DEFAULT_CONTENT_CLAUSE,
  REDIRECT_IMPL_EDGE_CF_FUNCTION,
  WEB_HOSTING_DEFAULT,
  WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
  WEB_HOSTING_DEFAULT_ORIGIN_PATH,
  WEB_HOSTING_DEFAULTS_DEFAULT,
  WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS,
  WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS_DEFAULTS_DEFAULT,
  WEB_HOSTING_TYPE_CLOUDFRONT_S3,
  WEB_HOSTING_TYPE_CLOUDFRONT_S3_DEFAULTS_DEFAULT,
  WEB_HOSTING_TYPE_NONE,
  WEB_HOSTING_TYPE_NONE_DEFAULTS_DEFAULT,
} from '../../consts';

// ----------------------------------------------------------------------
export const DnsConfigMx = z.object({
  type: z.literal('MX'),
  hostName: z.string(),
  priority: z.number(),
});
export type DnsConfigMx = z.TypeOf<typeof DnsConfigMx>;

export const DnsConfigCname = z.object({
  type: z.literal('CNAME'),
  recordName: z.string(),
  domainName: z.string(),
});
export type DnsConfigCname = z.TypeOf<typeof DnsConfigCname>;

export const DnsConfigTxt = z.object({
  type: z.literal('TXT'),
  recordName: z.string(),
  values: z.array(z.string()),
});
export type DnsConfigTxt = z.TypeOf<typeof DnsConfigTxt>;

export const DnsRecordSpec = z.union([DnsConfigMx, DnsConfigCname, DnsConfigTxt]);
export type DnsRecordSpec = z.TypeOf<typeof DnsRecordSpec>;

export const ExtraDnsClause = z.array(DnsRecordSpec);
export type ExtraDnsClause = z.TypeOf<typeof ExtraDnsClause>;

// ----------------------------------------------------------------------
export const RedirectClauseEdgeCfFunction = z.object({
  implementation: z.literal(REDIRECT_IMPL_EDGE_CF_FUNCTION),
  source: z.string().min(1),
  target: z.string().min(4),
});
export type RedirectClauseEdgeCfFunction = z.TypeOf<typeof RedirectClauseEdgeCfFunction>;

// NOTE: change to union if we add more than one kind of redirect
export const RedirectClause = RedirectClauseEdgeCfFunction;
export type RedirectClause = RedirectClauseEdgeCfFunction;

// ----------------------------------------------------------------------
export const AuthClauseBasicEdgeCfFunction = z.object({
  type: z.literal(AUTH_TYPE_BASIC_AUTH),
  implementation: z.literal(AUTH_IMPL_EDGE_CF_FUNCTION),
  usernameSecretName: z.string().min(1),
  passwordSecretName: z.string().min(1),
});
export type AuthClauseBasicEdgeCfFunction = z.TypeOf<typeof AuthClauseBasicEdgeCfFunction>;

// NOTE: change to union if we add more than one kind of auth
export const AuthClause = AuthClauseBasicEdgeCfFunction;
export type AuthClause = AuthClauseBasicEdgeCfFunction;

// ----------------------------------------------------------------------
export const WafAwsManagedRule = z.object({
  name: z.string().min(1),
  priority: z.number().min(1),
});
export type WafAwsManagedRule = z.TypeOf<typeof WafAwsManagedRule>;

export const WafClause = z.object({
  enabled: z.boolean().default(false),
  AWSManagedRules: z.array(WafAwsManagedRule).optional().default([]),
});
export type WafClause = z.TypeOf<typeof WafClause>;

// ----------------------------------------------------------------------
export const ContentClause = z.object({
  producerId: z.enum(['none', 'default']),
});
export type ContentClause = z.TypeOf<typeof ContentClause>;

// ----------------------------------------------------------------------
export const WebHostingErrorResponse = z.object({
  ttl: z
    .number()
    .min(1)
    // .transform((x) => Duration.seconds(x))
    .optional(),
  httpStatus: z.number().min(100).max(599),
  responseHttpStatus: z.number().min(100).max(599).optional(),
  responsePagePath: z.string().min(1),
});
// .transform((x) => x as ErrorResponse);
export type WebHostingErrorResponse = z.TypeOf<typeof WebHostingErrorResponse>;

// ----------------------------------------------------------------------
export const WebHostingDefaultsClauseCloudfrontS3 = z.object({
  defaultRootObject: z
    .string()
    .min(1)
    .default('index.html')
    .optional()
    .default(WEB_HOSTING_TYPE_CLOUDFRONT_S3_DEFAULTS_DEFAULT.defaultRootObject),
  errorResponses: z
    .array(WebHostingErrorResponse)
    .optional()
    .default(WEB_HOSTING_TYPE_CLOUDFRONT_S3_DEFAULTS_DEFAULT.errorResponses),
  originPath: z.string().min(1).optional().default(WEB_HOSTING_DEFAULT_ORIGIN_PATH),
  content: ContentClause.default(DEFAULT_CONTENT_CLAUSE),
  waf: z
    .object({
      enabled: z.boolean().default(false),
      AWSManagedRules: z.array(WafAwsManagedRule).optional().default([]),
    })
    .optional(),
});
export type WebHostingDefaultsClauseCloudfrontS3 = z.TypeOf<typeof WebHostingDefaultsClauseCloudfrontS3>;

export const WebHostingDefaultsClauseCloudfrontHttps = z.object({
  originPath: z.string(),
});
export type WebHostingDefaultsClauseCloudfrontHttps = z.TypeOf<typeof WebHostingDefaultsClauseCloudfrontHttps>;

export const WebHostingDefaultsClauseNone = z.object({});
export type WebHostingDefaultsClauseNone = z.TypeOf<typeof WebHostingDefaultsClauseNone>;

export const WebHostingDefaultsClause = z.object({
  [WEB_HOSTING_TYPE_CLOUDFRONT_S3]: WebHostingDefaultsClauseCloudfrontS3.optional().default(
    WEB_HOSTING_TYPE_CLOUDFRONT_S3_DEFAULTS_DEFAULT
  ),
  [WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS]: WebHostingDefaultsClauseCloudfrontHttps.optional().default(
    WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS_DEFAULTS_DEFAULT
  ),
  [WEB_HOSTING_TYPE_NONE]: WebHostingDefaultsClauseNone.optional().default(WEB_HOSTING_TYPE_NONE_DEFAULTS_DEFAULT),
});
export type WebHostingDefaultsClause = z.TypeOf<typeof WebHostingDefaultsClause>;

// ----------------------------------------------------------------------
export const WebHostingTypeCloudFrontS3 = z.literal(WEB_HOSTING_TYPE_CLOUDFRONT_S3);
export type WebHostingTypeCloudFrontS3 = z.TypeOf<typeof WebHostingTypeCloudFrontS3>;

export const WebHostingClauseCloudfrontS3 = z.object({
  type: WebHostingTypeCloudFrontS3,
  domainName: z.string().min(1),
  originPath: z.string().min(1).default(WEB_HOSTING_DEFAULT_ORIGIN_PATH).optional(),
  defaultRootObject: z.string().min(1).default(WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT).optional(),
  errorResponses: z.array(WebHostingErrorResponse).optional(),
  waf: WafClause.optional(),
  redirect: RedirectClause.optional(),
  auth: AuthClause.optional(),
  content: ContentClause.optional(),
});
export type WebHostingClauseCloudfrontS3 = z.TypeOf<typeof WebHostingClauseCloudfrontS3>;

export const WebHostingTypeCloudfrontHttps = z.literal(WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS);
export type WebHostingTypeCloudfrontHttps = z.TypeOf<typeof WebHostingTypeCloudfrontHttps>;

export const WebHostingClauseCloudfrontHttps = z.object({
  type: WebHostingTypeCloudfrontHttps,
  domainName: z.string().min(1),
  proxyHost: z.string().min(1),
  originPath: z.string().min(1).default('/').optional(),
  waf: WafClause.optional(),
});
export type WebHostingClauseCloudfrontHttps = z.TypeOf<typeof WebHostingClauseCloudfrontHttps>;

export const WebHostingTypeNone = z.literal(WEB_HOSTING_TYPE_NONE);
export type WebHostingTypeNone = z.TypeOf<typeof WebHostingTypeNone>;

export const WebHostingClauseNone = z.object({
  type: WebHostingTypeNone,
});
export type WebHostingClauseNone = z.TypeOf<typeof WebHostingClauseNone>;

export const WebHostingType = z.union([WebHostingTypeCloudFrontS3, WebHostingTypeCloudfrontHttps, WebHostingTypeNone]);
export type WebHostingType = z.TypeOf<typeof WebHostingType>;

export const WebHostingClause = z.union([
  WebHostingClauseCloudfrontS3,
  WebHostingClauseCloudfrontHttps,
  WebHostingClauseNone,
]);
export type WebHostingClause = z.TypeOf<typeof WebHostingClause>;

export const WebHostingClauseWithResources = z.union([WebHostingClauseCloudfrontS3, WebHostingClauseCloudfrontHttps]);
export type WebHostingClauseWithResources = z.TypeOf<typeof WebHostingClauseWithResources>;

// ----------------------------------------------------------------------
export const NotificationsClause = z.object({
  disabled: z.boolean().optional(),
  noSubscription: z.boolean().optional(),
  subscriptionEmail: z
    .string()
    .regex(/^.+@.+\..+$/)
    .optional(),
});
export type NotificationsClause = z.TypeOf<typeof NotificationsClause>;

// ----------------------------------------------------------------------
export const SiteOMaticManifest = z
  .object({
    domainName: z.string().min(1),
    title: z.string().optional(),
    region: z
      .string()
      .regex(/..-[a-z]+-\d+[a-z]?/)
      .optional(),
    extraDnsConfig: ExtraDnsClause.optional(),
    webmasterEmail: z.string().email().optional(),
    registrar: z.enum(['aws-route53', 'dynadot']).optional(),
    protected: z.boolean().optional(),

    webHostingDefaults: WebHostingDefaultsClause.optional(),
    webHosting: z.array(WebHostingClause).optional(),

    notifications: NotificationsClause.optional(),
  })
  .strict()
  // Apply defaults
  .transform((x) => {
    const webHostingDefaults = x.webHostingDefaults ?? WEB_HOSTING_DEFAULTS_DEFAULT;
    const applyWebHostingDefaults = (x: WebHostingClause) => ({
      ...webHostingDefaults[x.type],
      ...x,
    });

    return {
      ...x,
      region: x.region ?? DEFAULT_CERTIFICATE_REGION,
      protected: x.protected ?? false,
      webHostingDefaults,
      webHosting: (x.webHosting && x.webHosting.length > 0
        ? x.webHosting.map(applyWebHostingDefaults)
        : [WEB_HOSTING_DEFAULT(x.domainName)]
      ).map(applyWebHostingDefaults),
    };
  });
export type SiteOMaticManifest = z.TypeOf<typeof SiteOMaticManifest>;
