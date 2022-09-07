import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

import type { SomConfig } from '../consts';
import { SOM_TAG_NAME } from '../consts';
import { assumeSomRole } from './sts';

export async function getSomSecrets(
  config: SomConfig,
  region: string,
  secretNames: Array<string>
): Promise<Record<string, string>> {
  const somRoleCredentials = await assumeSomRole(config, region);

  const client = new SecretsManagerClient({ region, credentials: somRoleCredentials });

  const cmd1 = new ListSecretsCommand({});
  const secrets = await client.send(cmd1);
  if (!secrets || !secrets.SecretList) return {};

  const somSecretNames = secrets.SecretList.filter(({ Tags }) => Tags && Tags.find(({ Key }) => Key === SOM_TAG_NAME))
    .map(({ Name }) => Name)
    .filter((Name) => secretNames.includes(Name as string));

  const somSecrets = await Promise.all(
    somSecretNames.map(async (Name) => {
      const cmd2 = new GetSecretValueCommand({ SecretId: Name as string });
      const secretValue = await client.send(cmd2);
      return { Name: Name as string, Value: secretValue.SecretString as string };
    })
  );

  return somSecrets.reduce((acc, val) => {
    acc[val.Name] = val.Value;
    return acc;
  }, {} as Record<string, string>);
}

export async function listSomSecrets(config: SomConfig, region: string): Promise<Array<Record<string, string>>> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SecretsManagerClient({ region, credentials: somRoleCredentials });

  const cmd1 = new ListSecretsCommand({});
  const secrets = await client.send(cmd1);
  if (!secrets || !secrets.SecretList) return [];

  return secrets.SecretList.filter(({ Tags }) => Tags && Tags.find(({ Key }) => Key === SOM_TAG_NAME)).map(
    ({ Name }) => ({ Name: Name as string })
  );
}

export async function addSomSecret(
  config: SomConfig,
  region: string,
  name: string,
  value: string
): Promise<Array<Record<string, string>>> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SecretsManagerClient({ region, credentials: somRoleCredentials });

  const cmd1 = new CreateSecretCommand({
    Name: name,
    SecretString: value,
    Tags: [{ Key: SOM_TAG_NAME, Value: SOM_TAG_NAME }],
  });
  await client.send(cmd1);

  return listSomSecrets(config, region);
}

export async function deleteSomSecret(
  config: SomConfig,
  region: string,
  name: string
): Promise<Array<Record<string, string>>> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SecretsManagerClient({ region, credentials: somRoleCredentials });

  const cmd1 = new DeleteSecretCommand({ SecretId: name, ForceDeleteWithoutRecovery: true });
  await client.send(cmd1);

  return listSomSecrets(config, region);
}
