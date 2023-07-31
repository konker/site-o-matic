import {
  REGISTRAR_ID_AWS_ROUTE53,
  SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID,
  SSM_PARAM_NAME_CODE_PIPELINE_ARN,
  SSM_PARAM_NAME_HOSTED_ZONE_ID,
  SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS,
  SSM_PARAM_NAME_PROTECTED_STATUS,
} from '../consts';
import type { SomContext } from '../types';
import { getParam } from '../utils';
import type { Facts } from './index';
import { is, isNot, rulesEngineFactory } from './index';

export const SOM_FACTS_NAMES = [
  'hasAwsRoute53HostedZone', // *
  'hasHostedZoneIdParam',
  'hasHostedZoneNameServers',
  'hasHostedZoneAttributes',
  'hasDnsResolvedNameservers',
  'hasDnsResolvedTxtRecord',
  'hasRegistrarConfig',
  'hasRegistrarNameservers', // *
  'has200ConnectionStatus',
  'hasAwsRoute53RegistrarConfig',
  'registrarNameserversMatchHostedZoneNameServers', // *
  'dnsResolvedNameserversMatchHostedZoneNameServers',
  'nameserversSetButNotPropagated',
  'hostedZoneAttributesMatch',
  'hostedZoneDnsTxtRecordMatch',
  'hostedZoneVerified',
  'needsCloudfrontDist',
  'hasCloudfrontDistId',
  'needsCodePipeline',
  'hasCodePipelineArn',

  'isStatusNotStarted',
  'isStatusHostedZoneAwaitingNsConfig',
  'isStatusHostedZoneOk',
  'isStatusSiteFunctional',
  'protectedManifest',
  'protectedSsm',
] as const;
export type SomFactNames = typeof SOM_FACTS_NAMES;
export type SomFacts = Facts<SomFactNames>;

export const siteOMaticRules = rulesEngineFactory<SomFactNames, SomContext>({
  hasHostedZoneIdParam: async (_facts, context) => is(getParam(context, SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS)),
  hasHostedZoneNameServers: async (_facts, context) => is(context.hostedZoneNameservers),
  hasHostedZoneAttributes: async (_facts, context) => is(context.hostedZoneAttributes),
  hasDnsResolvedNameservers: async (_facts, context) => is(context.dnsResolvedNameserverRecords),
  hasRegistrarNameservers: async (_facts, context) => is(context.registrarNameservers),
  hasDnsResolvedTxtRecord: async (_facts, context) => is(context.dnsVerificationTxtRecord),
  protectedManifest: async (_facts, context) => context.manifest?.protected === true,
  protectedSsm: async (_facts, context) => getParam(context, SSM_PARAM_NAME_PROTECTED_STATUS) === 'true',

  dnsResolvedNameserversMatchHostedZoneNameServers: async (facts, context) =>
    is(facts.hasDnsResolvedNameservers) &&
    is(facts.hasHostedZoneNameServers) &&
    is(context.hostedZoneNameservers?.every((ns) => context.dnsResolvedNameserverRecords?.includes(ns))) &&
    context.hostedZoneNameservers?.length === context.dnsResolvedNameserverRecords?.length,

  registrarNameserversMatchHostedZoneNameServers: async (facts, context) =>
    is(facts.hasRegistrarNameservers) &&
    is(facts.hasHostedZoneNameServers) &&
    is(context.hostedZoneNameservers?.every((ns) => context.registrarNameservers?.includes(ns))) &&
    context.hostedZoneNameservers?.length === context.registrarNameservers?.length,

  hostedZoneAttributesMatch: async (facts, context) =>
    is(facts.hasHostedZoneIdParam) &&
    is(facts.hasHostedZoneAttributes) &&
    context.hostedZoneAttributes?.hostedZoneId === getParam(context, SSM_PARAM_NAME_HOSTED_ZONE_ID),

  hostedZoneDnsTxtRecordMatch: async (facts, context) =>
    is(facts.hasHostedZoneIdParam) &&
    is(facts.hasDnsResolvedTxtRecord) &&
    context.dnsVerificationTxtRecord === getParam(context, SSM_PARAM_NAME_HOSTED_ZONE_ID),
  hasRegistrarConfig: async (_facts, context) => is(context.manifest?.registrar),

  hostedZoneVerified: async (facts, _context) =>
    is(facts.hostedZoneAttributesMatch) && is(facts.hostedZoneDnsTxtRecordMatch),

  has200ConnectionStatus: async (_facts, context) => is(context.connectionStatus?.statusCode === 200), // *

  nameserversSetButNotPropagated: async (facts, _context) =>
    is(facts.hasRegistrarConfig) &&
    is(facts.registrarNameserversMatchHostedZoneNameServers) &&
    isNot(facts.dnsResolvedNameserversMatchHostedZoneNameServers),

  hasAwsRoute53RegistrarConfig: async (_facts, context) => context.manifest?.registrar === REGISTRAR_ID_AWS_ROUTE53,
  hasAwsRoute53HostedZone: async (_facts, _context) => false, // *
  needsCloudfrontDist: async (_facts, context) => is(context.manifest?.webHosting),
  hasCloudfrontDistId: async (_facts, context) => is(getParam(context, SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID)),
  needsCodePipeline: async (_facts, context) => is(context.manifest?.pipeline),
  hasCodePipelineArn: async (_facts, context) => is(getParam(context, SSM_PARAM_NAME_CODE_PIPELINE_ARN)),

  // SOM_STATUS_NOT_STARTED
  isStatusNotStarted: async (facts, _context) => isNot(facts.hasHostedZoneIdParam),

  // SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG
  isStatusHostedZoneAwaitingNsConfig: async (facts, _context) =>
    is(facts.hasHostedZoneIdParam) &&
    (isNot(facts.hostedZoneVerified) || isNot(facts.dnsResolvedNameserversMatchHostedZoneNameServers)),

  // SOM_STATUS_HOSTED_ZONE_OK
  isStatusHostedZoneOk: async (facts, _context) =>
    is(facts.hostedZoneVerified) && is(facts.dnsResolvedNameserversMatchHostedZoneNameServers),

  // SOM_STATUS_SITE_FUNCTIONAL
  isStatusSiteFunctional: async (facts, _context) => is(facts.isStatusHostedZoneOk) && is(facts.has200ConnectionStatus),
});
