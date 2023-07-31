import { findHostedZoneAttributes, getNsRecordsForHostedZone } from './aws/route53';
import * as secretsmanager from './aws/secretsmanager';
import * as ssm from './aws/ssm';
import { DEFAULT_AWS_REGION, SSM_PARAM_NAME_SOM_VERSION, VERSION } from './consts';
import { resolveDnsNameserverRecords, resolveDnsSomTxtRecord } from './dns';
import { getSiteConnectionStatus } from './http';
import { calculateDomainHash, formulateSomId } from './index';
import { getRegistrarConnector } from './registrar';
import type { HasManifest, HasNetworkDerived, SomConfig, SomContext, SomManifest } from './types';
import { getParam } from './utils';

export function hasManifest(context: SomContext): context is HasManifest<SomContext> {
  return (
    context.pathToManifestFile !== undefined &&
    context.manifest !== undefined &&
    context.rootDomainName !== undefined &&
    context.domainHash !== undefined &&
    context.somId !== undefined &&
    context.siteUrl !== undefined &&
    context.subdomains !== undefined &&
    context.certificateCloneNames !== undefined &&
    context.crossAccountAccessNames !== undefined
    // context.registrar !== undefined -- can be undefined
  );
}

export function hasNetworkDerived(context: SomContext): context is HasNetworkDerived<SomContext> {
  return (
    hasManifest(context) &&
    context.params !== undefined &&
    // context.hostedZoneAttributes !== undefined && -- can be undefined
    context.hostedZoneNameservers !== undefined &&
    context.registrarNameservers !== undefined &&
    context.dnsResolvedNameserverRecords !== undefined &&
    context.dnsVerificationTxtRecord !== undefined &&
    context.connectionStatus !== undefined
  );
}

export async function getRegistrarNameservers(config: SomConfig, context: SomContext): Promise<Array<string>> {
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
    somVersion: getParam(context, SSM_PARAM_NAME_SOM_VERSION) ?? VERSION,
  };
}

export async function loadNetworkDerivedContext(
  config: SomConfig,
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
    ssm.getSsmParams(config, DEFAULT_AWS_REGION, context.somId),
    findHostedZoneAttributes(config, context.manifest.rootDomainName),
    getNsRecordsForHostedZone(config, context.manifest.rootDomainName),
    resolveDnsNameserverRecords(context.manifest.rootDomainName),
    getRegistrarNameservers(config, context),
    resolveDnsSomTxtRecord(context.rootDomainName),
    getSiteConnectionStatus(context.rootDomainName, context.siteUrl),
  ]);

  return {
    ...context,
    params,
    hostedZoneAttributes,
    hostedZoneNameservers: hostedZoneNameservers ?? [],
    registrarNameservers,
    dnsResolvedNameserverRecords,
    dnsVerificationTxtRecord,
    connectionStatus,
  };
}

export function manifestDerivedProps(
  context: SomContext,
  pathToManifestFile: string,
  manifest: SomManifest
): HasManifest<SomContext> {
  return {
    ...context,
    pathToManifestFile,
    manifest,
    rootDomainName: manifest.rootDomainName,
    domainHash: calculateDomainHash(manifest.rootDomainName),
    somId: formulateSomId(manifest.rootDomainName),
    siteUrl: `https://${manifest.rootDomainName}/`,
    subdomains: manifest.dns?.subdomains?.map((i: any) => i.domainName) ?? [],
    certificateCloneNames: manifest.certificate?.clones?.map((i: any) => i.name) ?? [],
    crossAccountAccessNames: manifest.crossAccountAccess?.map((i: any) => i.name) ?? [],
    registrar: manifest.registrar,
  };
}

export async function refreshContext(
  config: SomConfig,
  context: HasManifest<SomContext>
): Promise<HasNetworkDerived<SomContext>> {
  return loadContextDerivedProps(await loadNetworkDerivedContext(config, context));
}
