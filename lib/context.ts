import { findHostedZoneAttributes, getNsRecordValuesForDomainName } from './aws/route53';
import { getDoesBucketExist, getIsS3BucketEmpty } from './aws/s3';
import { getSsmParams, ssmBasePath } from './aws/ssm';
import type { SiteOMaticConfig } from './config/schemas/site-o-matic-config.schema';
import {
  REGISTRAR_ID_AWS_ROUTE53,
  SSM_PARAM_NAME_DOMAIN_BUCKET_NAME,
  SSM_PARAM_NAME_SOM_VERSION,
  VERSION,
} from './consts';
import { resolveDnsNameserverRecords, resolveDnsSomTxtRecord } from './dns';
import { getSiteConnectionStatus } from './http';
import { calculateDomainHash, formulateSomId } from './index';
import type { SiteOMaticManifest } from './manifest/schemas/site-o-matic-manifest.schema';
import { getRegistrarConnector } from './registrar';
import type { SomFacts } from './rules/site-o-matic.rules';
import { siteOMaticRules } from './rules/site-o-matic.rules';
import * as secrets from './secrets';
import { getAllSomSecrets } from './secrets';
import type { HasManifest, HasNetworkDerived, SomContext } from './types';
import { contextTemplateString, getContextParam, getParam } from './utils';

export const DEFAULT_INITIAL_CONTEXT: SomContext = {
  somVersion: VERSION,
  rootDomainName: 'UNKNOWN ROOT DOMAIN NAME',
};

export function hasManifest(context: SomContext): context is HasManifest<SomContext> {
  return (
    context.pathToManifestFile !== undefined &&
    context.manifest !== undefined &&
    context.rootDomainName !== undefined &&
    context.domainHash !== undefined &&
    context.somId !== undefined &&
    context.siteUrl !== undefined &&
    context.subdomains !== undefined
    // context.registrar !== undefined -- can be undefined
  );
}

export function hasNetworkDerived(context: SomContext): context is HasNetworkDerived<SomContext> {
  return (
    hasManifest(context) &&
    context.params !== undefined &&
    context.secrets !== undefined &&
    context.hostedZoneNameservers !== undefined &&
    context.registrarNameservers !== undefined &&
    context.dnsResolvedNameserverRecords !== undefined &&
    context.connectionStatus !== undefined
    // context.dnsVerificationTxtRecord !== undefined && -- can be undefined
    // context.hostedZoneAttributes !== undefined && -- can be undefined
  );
}

export async function getRegistrarNameservers(
  config: SiteOMaticConfig,
  context: HasManifest<SomContext>
): Promise<Array<string>> {
  if (!context.rootDomainName || !context.registrar) {
    return [];
  }
  const registrarConnector = getRegistrarConnector(context.registrar);
  const somSecrets = await secrets.getAllSomSecrets(config, context.manifest.region, context.somId);

  if (!registrarConnector.SECRETS.every((secretName) => !!somSecrets.lookup[secretName])) {
    console.log(`WARNING: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`);
    return [];
  } else {
    return registrarConnector.getNameServers(config, context.manifest, somSecrets, context.rootDomainName);
  }
}

export async function loadContextDerivedProps(
  context: HasNetworkDerived<SomContext>
): Promise<HasNetworkDerived<SomContext>> {
  return {
    ...context,
    somVersion: getContextParam(context, SSM_PARAM_NAME_SOM_VERSION) ?? VERSION,
  };
}

export async function loadNetworkDerivedContext(
  config: SiteOMaticConfig,
  context: HasManifest<SomContext>
): Promise<HasNetworkDerived<SomContext>> {
  const [
    params,
    secrets,
    hostedZoneAttributes,
    hostedZoneNameservers,
    dnsResolvedNameserverRecords,
    registrarNameservers,
    dnsVerificationTxtRecord,
    connectionStatus,
  ] = await Promise.all([
    getSsmParams(config, config.AWS_REGION_CONTROL_PLANE, ssmBasePath(config, context.somId)),
    getAllSomSecrets(config, context.manifest.region, context.somId),
    findHostedZoneAttributes(config, context.manifest, context.rootDomainName),
    getNsRecordValuesForDomainName(config, context.manifest, context.rootDomainName),
    resolveDnsNameserverRecords(context.rootDomainName),
    getRegistrarNameservers(config, context),
    resolveDnsSomTxtRecord(context.rootDomainName),
    getSiteConnectionStatus(context.rootDomainName, context.siteUrl),
  ]);
  const s3BucketName = getParam(params, SSM_PARAM_NAME_DOMAIN_BUCKET_NAME);
  const doesS3BucketExist = !!s3BucketName
    ? await getDoesBucketExist(config, context.manifest.region, s3BucketName)
    : false;
  const isS3BucketEmpty = !!s3BucketName
    ? await getIsS3BucketEmpty(config, context.manifest.region, s3BucketName)
    : false;

  return {
    ...context,
    params,
    secrets,
    hostedZoneAttributes,
    hostedZoneNameservers: hostedZoneNameservers ?? [],
    registrarNameservers,
    dnsResolvedNameserverRecords,
    dnsVerificationTxtRecord,
    connectionStatus,
    doesS3BucketExist,
    isS3BucketEmpty,
  };
}

export function manifestDerivedProps(
  config: SiteOMaticConfig,
  context: SomContext,
  pathToManifestFile: string,
  cdkCommand: string,
  manifest: SiteOMaticManifest,
  manifestHash: string
): HasManifest<SomContext> {
  const ret: HasManifest<SomContext> = {
    ...context,
    pathToManifestFile,
    cdkCommand,
    manifest,
    manifestHash,
    rootDomainName: manifest.domainName,
    domainHash: calculateDomainHash(manifest.domainName),
    somId: formulateSomId(config, manifest.domainName),
    siteUrl: `https://${manifest.domainName}/`,
    subdomains: [],
    registrar: manifest.registrar,
  };
  return {
    ...ret,
    webmasterEmail: contextTemplateString(manifest.webmasterEmail ?? config.WEBMASTER_EMAIL_DEFAULT, ret),
  };
}

export async function refreshContextPass1(
  config: SiteOMaticConfig,
  context: HasManifest<SomContext>
): Promise<HasNetworkDerived<SomContext>> {
  return loadContextDerivedProps(await loadNetworkDerivedContext(config, context));
}

export async function refreshContextPass2(
  context: HasNetworkDerived<SomContext>,
  facts: SomFacts
): Promise<HasNetworkDerived<SomContext>> {
  return {
    ...context,
    registrar: facts.isAwsRoute53RegisteredDomain ? REGISTRAR_ID_AWS_ROUTE53 : context.registrar,
    registrarNameservers: facts.isAwsRoute53RegisteredDomain
      ? context.hostedZoneNameservers
      : context.registrarNameservers,
  };
}

export async function loadContext(
  config: SiteOMaticConfig,
  pathToManifestFile: string,
  cdkCommand: string,
  manifest: SiteOMaticManifest,
  manifestHash: string
): Promise<HasNetworkDerived<SomContext>> {
  const contextPass1 = await refreshContextPass1(
    config,
    manifestDerivedProps(config, DEFAULT_INITIAL_CONTEXT, pathToManifestFile, cdkCommand, manifest, manifestHash)
  );
  const facts = await siteOMaticRules(contextPass1);
  return refreshContextPass2(contextPass1, facts);
}
