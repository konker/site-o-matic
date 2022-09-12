import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import type { Credentials } from '@aws-sdk/types/dist-types/credentials';

import type { SomConfig } from '../types';

export function stsAssumeRoleParams(config: SomConfig) {
  return {
    RoleArn: config.SOM_ROLE_ARN,
    DurationSeconds: 900,
    RoleSessionName: 'som-cli-session',
  };
}

export async function assumeSomRole(config: SomConfig, region: string): Promise<Credentials> {
  const client = new STSClient({ region });
  const cmd1 = new AssumeRoleCommand(stsAssumeRoleParams(config));
  const result = await client.send(cmd1);

  if (
    !result.Credentials ||
    !result.Credentials.AccessKeyId ||
    !result.Credentials.SecretAccessKey ||
    !result.Credentials.SessionToken
  ) {
    throw new Error('[SOM] Could not assume SOM role');
  }
  return {
    accessKeyId: result.Credentials.AccessKeyId,
    secretAccessKey: result.Credentials.SecretAccessKey,
    sessionToken: result.Credentials.SessionToken,
  };
}
