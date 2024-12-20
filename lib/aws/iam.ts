import {
  CreateUserCommand,
  DeleteSSHPublicKeyCommand,
  IAMClient,
  ListSSHPublicKeysCommand,
  ListUsersCommand,
  ListUserTagsCommand,
  UploadSSHPublicKeyCommand,
} from '@aws-sdk/client-iam';

import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';

export async function listSomUsers(config: SiteOMaticConfig, region: string): Promise<Array<Record<string, string>>> {
  const client = new IAMClient({ region });

  const cmd1 = new ListUsersCommand({});
  const users = await client.send(cmd1);
  if (!users?.Users) return [];

  const usersWithTags = await Promise.all(
    users.Users.map(async (user) => {
      const cmd2 = new ListUserTagsCommand({ UserName: user.UserName });
      const tags = (await client.send(cmd2))?.Tags;
      if (tags) {
        user.Tags = tags;
      }
      return user;
    })
  );

  return usersWithTags
    .filter(({ Tags, UserName }) => UserName && Tags?.find(({ Key }) => Key === config.SOM_TAG_NAME))
    .map(({ UserName }) => ({
      UserName: UserName as string,
    }));
}

export async function addSomUser(
  config: SiteOMaticConfig,
  region: string,
  username: string
): Promise<Array<{ [key: string]: string }>> {
  const client = new IAMClient({ region });

  const cmd1 = new CreateUserCommand({
    UserName: username,
    Tags: [{ Key: config.SOM_TAG_NAME, Value: config.SOM_TAG_NAME }],
  });
  await client.send(cmd1);

  return listSomUsers(config, region);
}

export async function listPublicKeys(
  _config: SiteOMaticConfig,
  region: string,
  userName: string
): Promise<Array<Record<string, string>>> {
  const client = new IAMClient({ region });

  const cmd1 = new ListSSHPublicKeysCommand({ UserName: userName });
  const result = await client.send(cmd1);
  if (!result?.SSHPublicKeys) return [];

  return result.SSHPublicKeys.filter(({ SSHPublicKeyId, Status }) => !!SSHPublicKeyId && !!Status).map(
    ({ SSHPublicKeyId, Status }) => ({
      SSHPublicKeyId: SSHPublicKeyId as string,
      Status: Status as string,
    })
  );
}

export async function addPublicKey(
  config: SiteOMaticConfig,
  region: string,
  userName: string,
  publicKey: string
): Promise<Array<{ [key: string]: string }>> {
  const client = new IAMClient({ region });

  const cmd1 = new UploadSSHPublicKeyCommand({ UserName: userName, SSHPublicKeyBody: publicKey });
  await client.send(cmd1);

  return listPublicKeys(config, region, userName);
}

export async function deletePublicKey(
  config: SiteOMaticConfig,
  region: string,
  userName: string,
  publicKeyId: string
): Promise<Array<{ [key: string]: string }>> {
  const client = new IAMClient({ region });

  const cmd1 = new DeleteSSHPublicKeyCommand({ UserName: userName, SSHPublicKeyId: publicKeyId });
  await client.send(cmd1);

  return listPublicKeys(config, region, userName);
}

export async function deleteAllPublicKeys(config: SiteOMaticConfig, region: string, userName: string): Promise<void> {
  if (!userName) return;

  const client = new IAMClient({ region });

  try {
    const publicKeys = await listPublicKeys(config, region, userName);
    await Promise.all(
      publicKeys.map((i) => {
        const cmd1 = new DeleteSSHPublicKeyCommand({ UserName: userName, SSHPublicKeyId: i.SSHPublicKeyId });
        return client.send(cmd1);
      })
    );
  } catch (ex) {
    console.log('FAILED: ', ex);
  }
}
