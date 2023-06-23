import type { Connection } from '@aws-sdk/client-codestar-connections';
import {
  CodeStarConnectionsClient,
  CreateConnectionCommand,
  DeleteConnectionCommand,
  ListConnectionsCommand,
} from '@aws-sdk/client-codestar-connections';

import { SOM_TAG_NAME } from '../consts';
import type { SomConfig } from '../types';
import { assumeSomRole } from './sts';

export const CODESTAR_CONNECTION_PROVIDER_TYPE_GITHUB = 'GitHub';
export const CODESTAR_CONNECTION_PROVIDER_TYPE_BITBUCKET = 'Bitbucket';
export const CODESTAR_CONNECTION_PROVIDER_TYPE_GITHUB_ENTERPRISE_SERVER = 'GitHubEnterpriseServer';
export const CODESTAR_CONNECTION_PROVIDER_TYPES = [
  CODESTAR_CONNECTION_PROVIDER_TYPE_GITHUB,
  CODESTAR_CONNECTION_PROVIDER_TYPE_BITBUCKET,
  CODESTAR_CONNECTION_PROVIDER_TYPE_GITHUB_ENTERPRISE_SERVER,
];

export async function listCodeStarConnections(config: SomConfig, region: string): Promise<Array<Connection>> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new CodeStarConnectionsClient({ region, credentials: somRoleCredentials });

  const cmd1 = new ListConnectionsCommand({});
  const response = await client.send(cmd1);

  if (!response || !response.Connections) return [];

  return response.Connections.filter(({ ConnectionName }) => ConnectionName?.startsWith('som-'));
}

export async function addCodeStarConnection(
  config: SomConfig,
  region: string,
  connectionName: string,
  providerType: string
) {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new CodeStarConnectionsClient({ region, credentials: somRoleCredentials });

  const cmd1 = new CreateConnectionCommand({
    ProviderType: providerType,
    ConnectionName: `som-${connectionName}`,
    Tags: [{ Key: SOM_TAG_NAME, Value: SOM_TAG_NAME }],
  });
  await client.send(cmd1);

  return listCodeStarConnections(config, region);
}

export async function deleteCodeStarConnection(config: SomConfig, region: string, connectionArn: string) {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new CodeStarConnectionsClient({ region, credentials: somRoleCredentials });

  const cmd1 = new DeleteConnectionCommand({
    ConnectionArn: connectionArn,
  });
  await client.send(cmd1);

  return listCodeStarConnections(config, region);
}
