import * as AWS from 'aws-sdk';
import { SOM_TAG_NAME } from '../consts';

export async function listSomUsers(region: string): Promise<Array<{ [key: string]: string }>> {
  AWS.config.update({ region });
  const iam = new AWS.IAM();

  const users = await iam.listUsers().promise();
  if (!users || !users.Users) return [];

  const usersWithTags = await Promise.all(
    users.Users.map(async (user) => {
      user.Tags = (await iam.listUserTags({ UserName: user.UserName }).promise()).Tags;
      return user;
    })
  );

  return usersWithTags
    .filter(({ Tags }) => Tags && Tags.find(({ Key }) => Key === SOM_TAG_NAME))
    .map(({ UserName }) => ({
      UserName,
    }));
}

export async function addSomUser(region: string, username: string): Promise<Array<{ [key: string]: string }>> {
  AWS.config.update({ region });
  const iam = new AWS.IAM();

  await iam.createUser({ UserName: username, Tags: [{ Key: SOM_TAG_NAME, Value: SOM_TAG_NAME }] }).promise();

  return listSomUsers(region);
}

export async function listPublicKeys(region: string, userName: string): Promise<Array<{ [key: string]: string }>> {
  AWS.config.update({ region });
  const iam = new AWS.IAM();

  const result = await iam.listSSHPublicKeys({ UserName: userName }).promise();
  if (!result || !result.SSHPublicKeys) return [];

  return result.SSHPublicKeys.map(({ SSHPublicKeyId, Status }) => ({
    SSHPublicKeyId,
    Status,
  }));
}

export async function addPublicKey(
  region: string,
  userName: string,
  publicKey: string
): Promise<Array<{ [key: string]: string }>> {
  AWS.config.update({ region });
  const iam = new AWS.IAM();

  await iam.uploadSSHPublicKey({ UserName: userName, SSHPublicKeyBody: publicKey }).promise();

  return listPublicKeys(region, userName);
}

export async function deletePublicKey(
  region: string,
  userName: string,
  publicKeyId: string
): Promise<Array<{ [key: string]: string }>> {
  AWS.config.update({ region });
  const iam = new AWS.IAM();

  await iam.deleteSSHPublicKey({ UserName: userName, SSHPublicKeyId: publicKeyId }).promise();

  return listPublicKeys(region, userName);
}

export async function deleteAllPublicKeys(region: string, userName: string): Promise<void> {
  AWS.config.update({ region });
  const iam = new AWS.IAM();

  if (!userName) return;

  try {
    const publicKeys = await listPublicKeys(region, userName);
    await Promise.all(
      publicKeys.map((i) => iam.deleteSSHPublicKey({ UserName: userName, SSHPublicKeyId: i.SSHPublicKeyId }).promise())
    );
  } catch (ex) {
    console.log('FAILED: ', ex);
  }
}
