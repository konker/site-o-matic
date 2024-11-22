import {
  REGISTRAR_ID_AWS_ROUTE53,
  SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID,
  SSM_PARAM_NAME_DOMAIN_BUCKET_NAME,
  SSM_PARAM_NAME_DOMAIN_CERTIFICATE_ARN,
  SSM_PARAM_NAME_DOMAIN_PUBLISHER_USER_NAME,
  SSM_PARAM_NAME_DOMAIN_USER_USER_NAME,
  SSM_PARAM_NAME_HOSTED_ZONE_ID,
  SSM_PARAM_NAME_IS_AWS_ROUTE53_REGISTERED_DOMAIN,
  SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN,
  SSM_PARAM_NAME_PROTECTED_STATUS,
} from '../consts';
import type { SomContext } from '../types';
import { getContextParam } from '../utils';
import type { Facts } from './index';
import { is, isNonZero, isNot, rulesEngineFactory } from './index';

export const SOM_FACTS_NAMES = [
  'protectedManifest',
  'protectedSsm',
  'hasDomainUserUserNameParam',
  'hasDomainPublisherUserNameParam',
  'isBootstrapped',
  'hasHostedZoneIdParam',
  'hasHostedZoneNameServers',
  'hasHostedZoneAttributes',
  'hasDnsResolvedNameservers',
  'hasDnsResolvedTxtRecord',
  'hasDomainCertificateArnParam',
  'hasRegistrarConfig',
  'hasNotificationsSnsTopic',
  'isSnsNotificationsEnabled',
  'hasWebmasterEmail',
  'shouldSubscribeEmailToNotificationsSnsTopic',
  'hasDomainBucketNameParam',
  'doesContentBucketExist',
  'isContentBucketEmpty',
  'shouldDeployS3Content',
  'hasRegistrarNameservers',
  'has200ConnectionStatus',
  'hasAwsRoute53RegistrarConfig',
  'hasAwsRoute53RegisteredDomainParam',
  'isAwsRoute53RegisteredDomain',
  'registrarNameserversMatchHostedZoneNameServers',
  'dnsResolvedNameserversMatchHostedZoneNameServers',
  'nameserversSetButNotPropagated',
  'hostedZoneAttributesMatch',
  'hostedZoneDnsTxtRecordMatch',
  'hostedZoneVerified',
  'shouldDeployAllResources',
  // 'hasCertificateClones',
  // 'shouldDeployCertificateClones',
  'needsCloudfrontDist',
  'hasCloudfrontDistId',
  'isStatusNotStarted',
  'isStatusHostedZoneAwaitingNsConfig',
  'isStatusHostedZoneOk',
  'isStatusSiteFunctional',
] as const;
export type SomFactNames = typeof SOM_FACTS_NAMES;
export type SomFacts = Facts<SomFactNames>;

export const siteOMaticRules = rulesEngineFactory<SomFactNames, SomContext>({
  protectedManifest: async (_facts, context) => context.manifest?.protected === true,
  protectedSsm: async (_facts, context) => getContextParam(context, SSM_PARAM_NAME_PROTECTED_STATUS) === 'true',
  hasDomainUserUserNameParam: async (_facts, context) =>
    is(getContextParam(context, SSM_PARAM_NAME_DOMAIN_USER_USER_NAME)),
  hasDomainPublisherUserNameParam: async (_facts, context) =>
    is(getContextParam(context, SSM_PARAM_NAME_DOMAIN_PUBLISHER_USER_NAME)),
  isBootstrapped: async (facts, _context) =>
    is(facts.hasDomainUserUserNameParam) && is(facts.hasDomainPublisherUserNameParam),

  hasHostedZoneIdParam: async (_facts, context) => is(getContextParam(context, SSM_PARAM_NAME_HOSTED_ZONE_ID)),
  hasHostedZoneNameServers: async (_facts, context) => is(context.hostedZoneNameservers),
  hasHostedZoneAttributes: async (_facts, context) => is(context.hostedZoneAttributes),
  hasDnsResolvedNameservers: async (_facts, context) => is(context.dnsResolvedNameserverRecords),
  hasRegistrarNameservers: async (_facts, context) => is(context.registrarNameservers),
  hasDnsResolvedTxtRecord: async (_facts, context) => is(context.dnsVerificationTxtRecord),
  hasDomainCertificateArnParam: async (_facts, context) =>
    is(getContextParam(context, SSM_PARAM_NAME_DOMAIN_CERTIFICATE_ARN)),
  hasDomainBucketNameParam: async (_facts, context) => is(getContextParam(context, SSM_PARAM_NAME_DOMAIN_BUCKET_NAME)),
  doesContentBucketExist: async (_facts, context) => is(context.doesS3BucketExist),
  isContentBucketEmpty: async (_facts, context) => is(context.isS3BucketEmpty),
  shouldDeployS3Content: async (facts, context) =>
    is(context.cdkCommand === 'deploy') &&
    is(facts.hasDomainBucketNameParam) &&
    is(facts.doesContentBucketExist) &&
    is(facts.isContentBucketEmpty),

  hasNotificationsSnsTopic: async (_facts, context) =>
    is(getContextParam(context, SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN)),
  isSnsNotificationsEnabled: async (facts, context) =>
    is(facts.hasNotificationsSnsTopic) && isNot(context.manifest?.notifications?.disabled),

  hasWebmasterEmail: async (_facts, context) => is(context.webmasterEmail),
  shouldSubscribeEmailToNotificationsSnsTopic: async (facts, context) =>
    is(facts.hasNotificationsSnsTopic) &&
    is(facts.hasWebmasterEmail) &&
    isNot(context.manifest?.notifications?.noSubscription),

  dnsResolvedNameserversMatchHostedZoneNameServers: async (facts, context) =>
    is(facts.hasDnsResolvedNameservers) &&
    is(facts.hasHostedZoneNameServers) &&
    isNonZero(context.dnsResolvedNameserverRecords?.length) &&
    is(context.hostedZoneNameservers?.every((ns) => context.dnsResolvedNameserverRecords?.includes(ns))) &&
    context.hostedZoneNameservers?.length === context.dnsResolvedNameserverRecords?.length,
  registrarNameserversMatchHostedZoneNameServers: async (facts, context) =>
    is(facts.hasRegistrarNameservers) &&
    is(facts.hasHostedZoneNameServers) &&
    isNonZero(context.registrarNameservers?.length) &&
    context.hostedZoneNameservers?.length === context.registrarNameservers?.length &&
    is(context.hostedZoneNameservers?.every((ns) => context.registrarNameservers?.includes(ns))),

  hostedZoneAttributesMatch: async (facts, context) =>
    is(facts.hasHostedZoneIdParam) &&
    is(facts.hasHostedZoneAttributes) &&
    context.hostedZoneAttributes?.zoneId === getContextParam(context, SSM_PARAM_NAME_HOSTED_ZONE_ID),

  hostedZoneDnsTxtRecordMatch: async (facts, context) =>
    is(facts.hasHostedZoneIdParam) &&
    is(facts.hasDnsResolvedTxtRecord) &&
    context.dnsVerificationTxtRecord === getContextParam(context, SSM_PARAM_NAME_HOSTED_ZONE_ID),
  hasRegistrarConfig: async (_facts, context) => is(context.manifest?.registrar),

  hostedZoneVerified: async (facts, _context) =>
    is(facts.hostedZoneAttributesMatch) && is(facts.hostedZoneDnsTxtRecordMatch),

  has200ConnectionStatus: async (_facts, context) => is(context.connectionStatus?.statusCode === 200),

  nameserversSetButNotPropagated: async (facts, _context) =>
    is(facts.hasRegistrarConfig) &&
    is(facts.registrarNameserversMatchHostedZoneNameServers) &&
    isNot(facts.dnsResolvedNameserversMatchHostedZoneNameServers),

  hasAwsRoute53RegistrarConfig: async (_facts, context) => context.manifest?.registrar === REGISTRAR_ID_AWS_ROUTE53,
  hasAwsRoute53RegisteredDomainParam: async (_facts, context) =>
    getContextParam(context, SSM_PARAM_NAME_IS_AWS_ROUTE53_REGISTERED_DOMAIN) === 'true',
  isAwsRoute53RegisteredDomain: async (facts, _context) =>
    is(facts.hasAwsRoute53RegistrarConfig) ||
    is(facts.hasAwsRoute53RegisteredDomainParam) ||
    (isNot(facts.hasHostedZoneIdParam) &&
      isNot(facts.hasRegistrarConfig) &&
      is(facts.dnsResolvedNameserversMatchHostedZoneNameServers)),

  shouldDeployAllResources: async (facts, _context) => is(facts.registrarNameserversMatchHostedZoneNameServers),

  // hasCertificateClones: async (_facts, context) => isNonZero(context.manifest?.certificate?.clones?.length),
  // shouldDeployCertificateClones: async (facts, _context) =>
  //   is(facts.hasCertificateClones) && (is(facts.isAwsRoute53RegisteredDomain) || is(facts.hostedZoneVerified)),

  // TODO: Only used for status messages
  needsCloudfrontDist: async (_facts, context) => is(context.manifest?.webHosting),
  hasCloudfrontDistId: async (_facts, context) =>
    is(getContextParam(context, SSM_PARAM_NAME_CLOUDFRONT_DISTRIBUTION_ID)),

  // SOM_STATUS_NOT_STARTED
  isStatusNotStarted: async (facts, _context) => isNot(facts.hasHostedZoneIdParam),

  // SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG
  isStatusHostedZoneAwaitingNsConfig: async (facts, _context) =>
    is(facts.hasHostedZoneIdParam) &&
    (isNot(facts.hostedZoneVerified) || isNot(facts.dnsResolvedNameserversMatchHostedZoneNameServers)),

  // SOM_STATUS_HOSTED_ZONE_OK
  isStatusHostedZoneOk: async (facts, _context) =>
    (is(facts.hostedZoneVerified) && isNot(facts.isStatusHostedZoneAwaitingNsConfig)) ||
    (is(facts.isAwsRoute53RegisteredDomain) &&
      isNot(facts.isStatusHostedZoneAwaitingNsConfig) &&
      is(facts.registrarNameserversMatchHostedZoneNameServers)),

  // SOM_STATUS_SITE_FUNCTIONAL
  isStatusSiteFunctional: async (facts, _context) => is(facts.isStatusHostedZoneOk) && is(facts.has200ConnectionStatus),
});
