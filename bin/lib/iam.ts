import * as AWS from 'aws-sdk';

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
