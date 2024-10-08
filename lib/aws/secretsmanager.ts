import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';
import { assumeSomRole } from './sts';

export async function getSomSecrets(
  config: SiteOMaticConfig,
  region: string,
  secretNames: Array<string>
): Promise<Record<string, string>> {
  const somRoleCredentials = await assumeSomRole(config, region);

  const client = new SecretsManagerClient({ region, credentials: somRoleCredentials });

  const cmd1 = new ListSecretsCommand({});
  const secrets = await client.send(cmd1);
  if (!secrets?.SecretList) return {};

  const somSecretNames = secrets.SecretList.filter(({ Tags }) => Tags?.find(({ Key }) => Key === config.SOM_TAG_NAME))
    .map(({ Name }) => Name)
    .filter((Name) => secretNames.includes(Name as string));

  const somSecrets = await Promise.all(
    somSecretNames.map(async (Name) => {
      const cmd2 = new GetSecretValueCommand({ SecretId: Name as string });
      const secretValue = await client.send(cmd2);
      return { Name: Name as string, Value: secretValue.SecretString as string };
    })
  );

  return somSecrets.reduce(
    (acc, val) => {
      acc[val.Name] = val.Value;
      return acc;
    },
    {} as Record<string, string>
  );
}

export async function listSomSecrets(config: SiteOMaticConfig, region: string): Promise<Array<Record<string, string>>> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SecretsManagerClient({ region, credentials: somRoleCredentials });

  const cmd1 = new ListSecretsCommand({});
  const secrets = await client.send(cmd1);
  if (!secrets?.SecretList) return [];

  return secrets.SecretList.filter(({ Tags }) => Tags?.find(({ Key }) => Key === config.SOM_TAG_NAME)).map(
    ({ Name }) => ({ Name: Name as string })
  );
}

export async function addSomSecret(
  config: SiteOMaticConfig,
  region: string,
  name: string,
  value: string
): Promise<Array<Record<string, string>>> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SecretsManagerClient({ region, credentials: somRoleCredentials });

  const cmd1 = new CreateSecretCommand({
    Name: name,
    SecretString: value,
    Tags: [{ Key: config.SOM_TAG_NAME, Value: config.SOM_TAG_NAME }],
  });
  await client.send(cmd1);

  return listSomSecrets(config, region);
}

export async function deleteSomSecret(
  config: SiteOMaticConfig,
  region: string,
  name: string
): Promise<Array<Record<string, string>>> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SecretsManagerClient({ region, credentials: somRoleCredentials });

  const cmd1 = new DeleteSecretCommand({ SecretId: name, ForceDeleteWithoutRecovery: true });
  await client.send(cmd1);

  return listSomSecrets(config, region);
}
