import {
  CreateSecretCommand,
  DescribeSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  ResourceNotFoundException,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';
import type { SecretsPlain } from '../secrets/types';
import { assumeSomRole } from './sts';

export async function readSecret(config: SiteOMaticConfig, region: string, secretName: string): Promise<SecretsPlain> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SecretsManagerClient({ region, credentials: somRoleCredentials });

  // Try to describe the secret, if it doesn't exist, return empty secrets
  try {
    const cmd1 = new DescribeSecretCommand({
      SecretId: secretName,
    });
    await client.send(cmd1);
  } catch (ex: unknown) {
    // Return empty secrets
    if (ex instanceof ResourceNotFoundException) {
      return {};
    }

    // Some other error, so just re-throw
    throw ex;
  }

  const cmd2 = new GetSecretValueCommand({
    SecretId: secretName,
  });
  const secretPersisted = await client.send(cmd2);

  return JSON.parse(secretPersisted?.SecretString ?? '{}');
}

export async function upsertSecret(
  config: SiteOMaticConfig,
  region: string,
  secretName: string,
  secretsPlain: SecretsPlain
): Promise<SecretsPlain> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SecretsManagerClient({ region, credentials: somRoleCredentials });
  const secretPersisted = JSON.stringify(secretsPlain);

  // Try to describe the secret, if it doesn't exist, insert it
  try {
    const cmd1 = new DescribeSecretCommand({
      SecretId: secretName,
    });
    await client.send(cmd1);
  } catch (ex: unknown) {
    // Attempt to insert the secret
    if (ex instanceof ResourceNotFoundException) {
      const cmd1b = new CreateSecretCommand({
        Name: secretName,
        SecretString: secretPersisted,
      });
      await client.send(cmd1b);
    } else {
      // Some other error, so just re-throw
      throw ex;
    }
  }

  // We now definitely have a secret, so we can just update it (will be redundant the first time)
  const cmd2 = new PutSecretValueCommand({
    SecretId: secretName,
    SecretString: secretPersisted,
  });
  await client.send(cmd2);

  return readSecret(config, region, secretName);
}
