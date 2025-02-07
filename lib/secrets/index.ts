import * as secretsManager from '../aws/secretsmanager';
import * as ssm from '../aws/ssm';
import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';
import { SECRETS_SCOPE_GLOBAL, SECURE_STRING_FLAG } from '../consts';
import type { SomParam } from '../types';
import type { Secret, SecretMetadata, SecretsPlain, SecretsSet, SecretsSetCollection, SecretsSource } from './types';
import { ALL_SECRETS_SOURCES, SECRETS_SOURCE_SECRETS_MANAGER, SECRETS_SOURCE_SSM } from './types';

// --------------------------------------------------------------------------
export const EMPTY_SECRETS_SETS_COLLECTION: SecretsSetCollection = { secretsSets: [], lookup: {} } as const;

// --------------------------------------------------------------------------
export function _secretsPlainToSecretSet(secretsPlain: SecretsPlain, source: SecretsSource, scope: string): SecretsSet {
  return {
    source,
    scope,
    secretsPlain,
  };
}

export function _secretsSetsToSecretsSetCollection(secretsSets: Array<SecretsSet>): SecretsSetCollection {
  return {
    secretsSets,
    lookup: secretsSets.reduce(
      (acc, val) => ({
        ...acc,
        ...val.secretsPlain,
      }),
      {}
    ),
  };
}

export function _somParamsToSecretsPlain(somParams: Array<SomParam>): SecretsPlain {
  return somParams.reduce(
    (acc, param) => ({
      ...acc,
      [param.Param]: param.Value,
    }),
    {}
  );
}

// --------------------------------------------------------------------------
export function resolveSecretsManagerSecretName(config: SiteOMaticConfig, scope: string): string {
  return `/secrets/${config.SOM_PREFIX}/${scope}/site_secrets`;
}

export function resolveSsmSecretPath(config: SiteOMaticConfig, scope: string): string {
  return `/secrets/${config.SOM_PREFIX}/${scope}`;
}

// --------------------------------------------------------------------------
export async function getSecretsManagerScopedSomSecrets(
  config: SiteOMaticConfig,
  region: string,
  scope: string
): Promise<SecretsSet> {
  const secretName = resolveSecretsManagerSecretName(config, scope);
  const secretsPlain = await secretsManager.readSecret(config, region, secretName);
  return _secretsPlainToSecretSet(secretsPlain, SECRETS_SOURCE_SECRETS_MANAGER, scope);
}

export async function getSecretsManagerGlobalSomSecrets(config: SiteOMaticConfig, region: string): Promise<SecretsSet> {
  return getSecretsManagerScopedSomSecrets(config, region, SECRETS_SCOPE_GLOBAL);
}

// --------------------------------------------------------------------------
export async function getSsmScopedSomSecrets(
  config: SiteOMaticConfig,
  region: string,
  scope: string
): Promise<SecretsSet> {
  const secretsPath = resolveSsmSecretPath(config, scope);
  const somParams = await ssm.getSsmParams(config, region, secretsPath);
  const secretsPlain = _somParamsToSecretsPlain(somParams);

  return _secretsPlainToSecretSet(secretsPlain, SECRETS_SOURCE_SSM, scope);
}

export async function getSsmGlobalSomSecrets(config: SiteOMaticConfig, region: string): Promise<SecretsSet> {
  return getSsmScopedSomSecrets(config, region, SECRETS_SCOPE_GLOBAL);
}

// --------------------------------------------------------------------------
export async function getAllSomSecrets(
  config: SiteOMaticConfig,
  region: string | undefined,
  somId?: string
): Promise<SecretsSetCollection> {
  const secretsRegions = Array.from(
    new Set([region ?? config.AWS_REGION_CONTROL_PLANE, config.AWS_REGION_CONTROL_PLANE])
  );

  // Fetch global scoped secrets from manifest region, and from control plane region
  const globalReqs = [
    ...secretsRegions.map((region) => getSecretsManagerGlobalSomSecrets(config, region)),
    ...secretsRegions.map((region) => getSsmGlobalSomSecrets(config, region)),
  ];

  // If we have somId scope, also fetch somId-scoped secrets from manifest region, and from control plane region
  const scopedReqs =
    !somId || somId === SECRETS_SCOPE_GLOBAL
      ? []
      : [
          ...secretsRegions.map((region) => getSecretsManagerScopedSomSecrets(config, region, somId)),
          ...secretsRegions.map((region) => getSsmScopedSomSecrets(config, region, somId)),
        ];

  const secretSets = await Promise.all([...globalReqs, ...scopedReqs]);

  return _secretsSetsToSecretsSetCollection(secretSets);
}

// --------------------------------------------------------------------------
export async function getSomSecret(
  config: SiteOMaticConfig,
  region: string,
  scope: string | undefined,
  name: string
): Promise<Secret | undefined> {
  const secretSet = await getAllSomSecrets(config, region, scope);
  const value = secretSet.lookup[name];

  return value === undefined ? undefined : { name, value };
}

// --------------------------------------------------------------------------
export async function listSomSecretNames(
  config: SiteOMaticConfig,
  region: string,
  scope?: string
): Promise<Array<SecretMetadata>> {
  const secretSet = await getAllSomSecrets(config, region, scope);
  return secretSet.secretsSets.flatMap((secretSet) =>
    Object.keys(secretSet.secretsPlain).map((name) => ({ name, scope: secretSet.scope, source: secretSet.source }))
  );
}

// --------------------------------------------------------------------------
export async function addSomSecret(
  config: SiteOMaticConfig,
  region: string,
  somId: string,
  source: SecretsSource,
  scope: string,
  name: string,
  value: string
): Promise<Array<SecretMetadata>> {
  switch (source) {
    case SECRETS_SOURCE_SECRETS_MANAGER:
      {
        const secretName = resolveSecretsManagerSecretName(config, scope);
        const secretsPlain = await secretsManager.readSecret(config, region, secretName);
        const updatedSecretsPlain = {
          ...secretsPlain,
          [name]: value,
        };

        await secretsManager.upsertSecret(config, region, somId, secretName, updatedSecretsPlain);
      }
      break;
    case SECRETS_SOURCE_SSM: {
      const secretPath = resolveSsmSecretPath(config, scope);
      const secretName = `${secretPath}/${name}`;
      await ssm.createSsmParam(config, region, somId, secretName, value, SECURE_STRING_FLAG);
    }
  }

  return listSomSecretNames(config, region, scope);
}

// --------------------------------------------------------------------------
export async function deleteSomSecretBySource(
  config: SiteOMaticConfig,
  region: string,
  somId: string,
  source: SecretsSource,
  scope: string,
  name: string
): Promise<void> {
  switch (source) {
    case SECRETS_SOURCE_SECRETS_MANAGER:
      {
        const secretName = resolveSecretsManagerSecretName(config, scope);
        const secretsPlain = await secretsManager.readSecret(config, region, secretName);
        const updatedSecretsPlain = Object.entries(secretsPlain).reduce(
          (acc, [key, value]) => Object.assign(acc, key === name ? {} : { [key]: value }),
          {}
        );

        await secretsManager.upsertSecret(config, region, somId, secretName, updatedSecretsPlain);
      }
      break;
    case SECRETS_SOURCE_SSM:
      {
        const secretPath = resolveSsmSecretPath(config, scope);
        const secretName = `${secretPath}/${name}`;
        await ssm.deleteSsmParam(config, region, secretName);
      }
      break;
  }
}

// --------------------------------------------------------------------------
export async function deleteSomSecret(
  config: SiteOMaticConfig,
  region: string,
  somId: string,
  scope: string,
  name: string
): Promise<Array<SecretMetadata>> {
  for (const source of ALL_SECRETS_SOURCES) {
    await deleteSomSecretBySource(config, region, somId, source, scope, name);
  }

  return listSomSecretNames(config, region, scope);
}
