import { Duration } from 'aws-cdk-lib';
import type { ErrorResponse } from 'aws-cdk-lib/aws-cloudfront';
import * as z from 'zod';

import {
  REDIRECT_TYPE_EDGE_CF_FUNCTION,
  SERVICE_TYPE_REST_API,
  SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM,
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
  SITE_PIPELINE_TYPE_CODESTAR_CUSTOM,
  SITE_PIPELINE_TYPE_CODESTAR_S3,
  WEB_HOSTING_TYPE_CLOUDFRONT_S3,
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

export const SubdomainsClause = z.object({
  domainName: z.string().min(1),
  extraDnsConfig: z.array(DnsRecordSpec).optional(),
});
export type SubdomainsClause = z.TypeOf<typeof SubdomainsClause>;

export const DnsClause = z.object({
  domainName: z.string().min(1),
  extraDnsConfig: z.array(DnsRecordSpec).optional(),
  subdomains: z.array(SubdomainsClause).optional(),
});
export type DnsClause = z.TypeOf<typeof DnsClause>;

// ----------------------------------------------------------------------
export const WafAwsManagedRule = z.object({
  name: z.string().min(1),
  priority: z.number().min(1),
});
export type WafAwsManagedRule = z.TypeOf<typeof WafAwsManagedRule>;

export const WebHostingErrorResponse = z
  .object({
    ttl: z
      .number()
      .min(1)
      .transform((x) => Duration.seconds(x))
      .optional(),
    httpStatus: z.number().min(100).max(599),
    responseHttpStatus: z.number().min(100).max(599).optional(),
    responsePagePath: z.string().min(1),
  })
  .transform((x) => x as ErrorResponse);
export type WebHostingErrorResponse = z.TypeOf<typeof WebHostingErrorResponse>;

export const WebHostingClauseCloudfrontS3 = z.object({
  type: z.literal(WEB_HOSTING_TYPE_CLOUDFRONT_S3),
  originPath: z.string().min(1).default('/www').optional(),
  defaultRootObject: z.string().min(1).default('index.html').optional(),
  errorResponses: z.array(WebHostingErrorResponse).optional(),
  waf: z
    .object({
      enabled: z.boolean(),
      AWSManagedRules: z.array(WafAwsManagedRule).optional(),
    })
    .optional(),
});
export type WebHostingClauseCloudfrontS3 = z.TypeOf<typeof WebHostingClauseCloudfrontS3>;

/* [TODO]
export const WebHostingClauseNone = z.object({
  type: z.literal(WEB_HOSTING_TYPE_NONE),
});
export type WebHostingClauseNone = z.TypeOf<typeof WebHostingClauseNone>;
*/

// XXX: change to union if we add more than one kind of web hosting
export const WebHostingClause = WebHostingClauseCloudfrontS3;
export type WebHostingClause = WebHostingClauseCloudfrontS3;

// ----------------------------------------------------------------------
export const RedirectClauseEdgeCfFunction = z.object({
  type: z.literal(REDIRECT_TYPE_EDGE_CF_FUNCTION),
  source: z.string().min(1),
  target: z.string().min(4),
});
export type RedirectClauseEdgeCfFunction = z.TypeOf<typeof RedirectClauseEdgeCfFunction>;

// XXX: change to union if we add more than one kind of redirect
export const RedirectClause = RedirectClauseEdgeCfFunction;
export type RedirectClause = RedirectClauseEdgeCfFunction;

// ----------------------------------------------------------------------
export const CertificateCloneSpec = z.object({
  name: z.string().min(1),
  account: z.string().min(12),
  region: z.string().min(1),
});
export type CertificateCloneSpec = z.TypeOf<typeof CertificateCloneSpec>;

export const CertificateClause = z.object({
  clones: z.array(CertificateCloneSpec),
});
export type CertificateClause = z.TypeOf<typeof CertificateClause>;

// ----------------------------------------------------------------------
export const PipelineClauseCodeCommitS3 = z.object({
  type: z.literal(SITE_PIPELINE_TYPE_CODECOMMIT_S3),
});
export type PipelineClauseCodeCommitS3 = z.TypeOf<typeof PipelineClauseCodeCommitS3>;

export const PipelineBuildPhase = z.object({
  commands: z.array(z.string().min(1)).min(1),
});
export type PipelineBuildPhase = z.TypeOf<typeof PipelineBuildPhase>;

export const PipelineClauseCodeCommitCustom = z.object({
  type: z.literal(SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM),
  buildImage: z.string().min(1).optional(),
  buildPhases: z.record(z.string(), PipelineBuildPhase),
  buildFiles: z.array(z.string().min(1)).optional(),
});
export type PipelineClauseCodeCommitCustom = z.TypeOf<typeof PipelineClauseCodeCommitCustom>;

export const CodeStarConnectionArn = z.string().regex(/^arn:aws:codestar-connections:.*/);
export type CodeStarConnectionArn = z.TypeOf<typeof CodeStarConnectionArn>;

export const PipelineClauseCodeStarS3 = z.object({
  type: z.literal(SITE_PIPELINE_TYPE_CODESTAR_S3),
  codestarConnectionArn: CodeStarConnectionArn,
  owner: z.string().min(1),
  repo: z.string().min(1),
});
export type PipelineClauseCodeStarS3 = z.TypeOf<typeof PipelineClauseCodeStarS3>;

export const PipelineClauseCodeStarCustom = z.object({
  type: z.literal(SITE_PIPELINE_TYPE_CODESTAR_CUSTOM),
  codestarConnectionArn: CodeStarConnectionArn,
  owner: z.string().min(1),
  repo: z.string().min(1),
  buildImage: z.string().min(1).optional(),
  buildPhases: z.record(z.string(), PipelineBuildPhase),
  buildFiles: z.array(z.string().min(1)).optional(),
});
export type PipelineClauseCodeStarCustom = z.TypeOf<typeof PipelineClauseCodeStarCustom>;

export const PipelineClause = z.union([
  PipelineClauseCodeCommitS3,
  PipelineClauseCodeCommitCustom,
  PipelineClauseCodeStarS3,
  PipelineClauseCodeStarCustom,
]);
export type PipelineClause = z.TypeOf<typeof PipelineClause>;

// ----------------------------------------------------------------------
export const RestApiServiceSpec = z.object({
  type: z.literal(SERVICE_TYPE_REST_API),
  domainName: z.string().min(1),
  certificate: z.string().min(1),
  url: z.string().min(8),
  originPath: z.string().min(1).default('/').optional(),
});
export type RestApiServiceSpec = z.TypeOf<typeof RestApiServiceSpec>;

// XXX: change to union if we add more than one kind of service
export const ServiceSpec = RestApiServiceSpec;
export type ServiceSpec = RestApiServiceSpec;

// ----------------------------------------------------------------------
export const CrossAccountAccessSpec = z.object({
  name: z.string().min(1),
  arn: z.string().regex(/^arn.+/),
});
export type CrossAccountAccessSpec = z.TypeOf<typeof CrossAccountAccessSpec>;

// ----------------------------------------------------------------------
export const ContentClause = z.object({
  producerId: z.enum(['none', 'default']),
});
export type ContentClause = z.TypeOf<typeof ContentClause>;

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
    rootDomainName: z.string().min(1),
    title: z.string().optional(),
    dns: DnsClause.optional(),
    webmasterEmail: z.string().email().optional(),
    protected: z.boolean().optional(),
    webHosting: WebHostingClause.optional(),
    redirect: RedirectClause.optional(),
    certificate: CertificateClause.optional(),
    registrar: z.enum(['aws-route53', 'dynadot']).optional(),
    pipeline: PipelineClause.optional(),
    services: z.array(ServiceSpec).optional(),
    crossAccountAccess: z.array(CrossAccountAccessSpec).optional(),
    content: ContentClause.optional(),
    notifications: NotificationsClause.optional(),
  })
  // Apply defaults
  .transform((x) => ({
    ...x,
    protected: x.protected ?? false,
    dns: x.dns ?? {
      domainName: x.rootDomainName,
    },
    webHosting: x.webHosting ?? {
      type: WEB_HOSTING_TYPE_CLOUDFRONT_S3,
    },
  }));
export type SiteOMaticManifest = z.TypeOf<typeof SiteOMaticManifest>;
