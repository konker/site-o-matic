import { findHostedZoneAttributes, getNsRecordValuesForDomainName } from './aws/route53';
import { getIsS3BucketEmpty } from './aws/s3';
import * as secretsmanager from './aws/secretsmanager';
import * as ssm from './aws/ssm';
import { ssmBasePath } from './aws/ssm';
import type { SiteOMaticConfig } from './config/schemas/site-o-matic-config.schema';
import { DEFAULT_AWS_REGION, SSM_PARAM_NAME_DOMAIN_BUCKET_NAME, SSM_PARAM_NAME_SOM_VERSION, VERSION } from './consts';
import { resolveDnsNameserverRecords, resolveDnsSomTxtRecord } from './dns';
import { getSiteConnectionStatus } from './http';
import { calculateDomainHash, formulateSomId } from './index';
import type { SiteOMaticManifest } from './manifest/schemas/site-o-matic-manifest.schema';
import { getRegistrarConnector } from './registrar';
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
    context.hostedZoneNameservers !== undefined &&
    context.registrarNameservers !== undefined &&
    context.dnsResolvedNameserverRecords !== undefined &&
    context.connectionStatus !== undefined
    // context.dnsVerificationTxtRecord !== undefined && -- can be undefined
    // context.hostedZoneAttributes !== undefined && -- can be undefined
  );
}

export async function getRegistrarNameservers(config: SiteOMaticConfig, context: SomContext): Promise<Array<string>> {
  if (!context.rootDomainName || !context.registrar) {
    return [];
  }
  const registrarConnector = getRegistrarConnector(context.registrar);
  const somSecrets = await secretsmanager.getSomSecrets(config, DEFAULT_AWS_REGION, registrarConnector.SECRETS);
  if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
    console.log(`WARNING: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`);
    return [];
  } else {
    return registrarConnector.getNameServers(config, somSecrets, context.rootDomainName);
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
    hostedZoneAttributes,
    hostedZoneNameservers,
    dnsResolvedNameserverRecords,
    registrarNameservers,
    dnsVerificationTxtRecord,
    connectionStatus,
  ] = await Promise.all([
    ssm.getSsmParams(config, DEFAULT_AWS_REGION, ssmBasePath(context.somId)),
    findHostedZoneAttributes(config, context.rootDomainName),
    getNsRecordValuesForDomainName(config, context.rootDomainName),
    resolveDnsNameserverRecords(context.rootDomainName),
    getRegistrarNameservers(config, context),
    resolveDnsSomTxtRecord(context.rootDomainName),
    getSiteConnectionStatus(context.rootDomainName, context.siteUrl),
  ]);
  const s3BucketName = getParam(params, SSM_PARAM_NAME_DOMAIN_BUCKET_NAME);
  const isS3BucketEmpty = !!s3BucketName ? await getIsS3BucketEmpty(config, s3BucketName) : false;

  return {
    ...context,
    params,
    hostedZoneAttributes,
    hostedZoneNameservers: hostedZoneNameservers ?? [],
    registrarNameservers,
    dnsResolvedNameserverRecords,
    dnsVerificationTxtRecord,
    connectionStatus,
    isS3BucketEmpty,
  };
}

export function manifestDerivedProps(
  config: SiteOMaticConfig,
  context: SomContext,
  pathToManifestFile: string,
  manifest: SiteOMaticManifest
): HasManifest<SomContext> {
  const ret: HasManifest<SomContext> = {
    ...context,
    pathToManifestFile,
    manifest,
    rootDomainName: manifest.rootDomainName,
    domainHash: calculateDomainHash(manifest.rootDomainName),
    somId: formulateSomId(config, manifest.rootDomainName),
    siteUrl: `https://${manifest.rootDomainName}/`,
    subdomains: manifest.dns?.subdomains?.map((i: any) => i.domainName) ?? [],
    registrar: manifest.registrar,
  };
  return {
    ...ret,
    webmasterEmail: contextTemplateString(manifest.webmasterEmail ?? config.DEFAULT_WEBMASTER_EMAIL, ret),
  };
}

export async function refreshContext(
  config: SiteOMaticConfig,
  context: HasManifest<SomContext>
): Promise<HasNetworkDerived<SomContext>> {
  return loadContextDerivedProps(await loadNetworkDerivedContext(config, context));
}

export async function loadContext(
  config: SiteOMaticConfig,
  pathToManifestFile: string,
  manifest: SiteOMaticManifest
): Promise<HasNetworkDerived<SomContext>> {
  return refreshContext(config, manifestDerivedProps(config, DEFAULT_INITIAL_CONTEXT, pathToManifestFile, manifest));
}
