import * as AWS from 'aws-sdk';
import { SOM_TAG_NAME } from '../consts';

export async function getSomSecrets(region: string, secretNames: Array<string>): Promise<{ [key: string]: string }> {
  AWS.config.update({ region });
  const secretsmanager = new AWS.SecretsManager();

  const secrets = await secretsmanager.listSecrets().promise();
  if (!secrets || !secrets.SecretList) return {};

  const somSecretNames = secrets.SecretList.filter(({ Tags }) => Tags && Tags.find(({ Key }) => Key === SOM_TAG_NAME))
    .map(({ Name }) => Name)
    .filter((Name) => secretNames.includes(Name as string));

  const somSecrets = await Promise.all(
    somSecretNames.map(async (Name) => {
      const secretValue = await secretsmanager.getSecretValue({ SecretId: Name as string }).promise();
      return { Name: Name as string, Value: secretValue.SecretString as string };
    })
  );

  return somSecrets.reduce((acc, val) => {
    acc[val.Name] = val.Value;
    return acc;
  }, {} as { [key: string]: string });
}

export async function listSomSecrets(region: string): Promise<Array<{ [key: string]: string }>> {
  AWS.config.update({ region });
  const secretsmanager = new AWS.SecretsManager();

  const secrets = await secretsmanager.listSecrets().promise();
  if (!secrets || !secrets.SecretList) return [];

  return secrets.SecretList.filter(({ Tags }) => Tags && Tags.find(({ Key }) => Key === SOM_TAG_NAME)).map(
    ({ Name }) => ({ Name: Name as string })
  );
}

export async function addSomSecret(
  region: string,
  name: string,
  value: string
): Promise<Array<{ [key: string]: string }>> {
  AWS.config.update({ region });
  const secretsmanager = new AWS.SecretsManager();

  await secretsmanager
    .createSecret({ Name: name, SecretString: value, Tags: [{ Key: SOM_TAG_NAME, Value: SOM_TAG_NAME }] })
    .promise();

  return listSomSecrets(region);
}

export async function deleteSomSecret(region: string, name: string): Promise<Array<{ [key: string]: string }>> {
  AWS.config.update({ region });
  const secretsmanager = new AWS.SecretsManager();

  await secretsmanager.deleteSecret({ SecretId: name, ForceDeleteWithoutRecovery: true }).promise();

  return listSomSecrets(region);
}
