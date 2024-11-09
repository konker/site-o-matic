import type { Connection, ProviderType } from '@aws-sdk/client-codestar-connections';
import {
  CodeStarConnectionsClient,
  CreateConnectionCommand,
  DeleteConnectionCommand,
  ListConnectionsCommand,
} from '@aws-sdk/client-codestar-connections';

import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';

export const CODESTAR_CONNECTION_PROVIDER_TYPE_GITHUB = 'GitHub';
export const CODESTAR_CONNECTION_PROVIDER_TYPE_BITBUCKET = 'Bitbucket';
export const CODESTAR_CONNECTION_PROVIDER_TYPE_GITHUB_ENTERPRISE_SERVER = 'GitHubEnterpriseServer';
export const CODESTAR_CONNECTION_PROVIDER_TYPE_GITLAB = 'GitLab';
export const CODESTAR_CONNECTION_PROVIDER_TYPE_GITLAB_SELF_MANAGED = 'GitLabSelfManaged';
export const CODESTAR_CONNECTION_PROVIDER_TYPES = [
  CODESTAR_CONNECTION_PROVIDER_TYPE_GITHUB,
  CODESTAR_CONNECTION_PROVIDER_TYPE_BITBUCKET,
  CODESTAR_CONNECTION_PROVIDER_TYPE_GITHUB_ENTERPRISE_SERVER,
  CODESTAR_CONNECTION_PROVIDER_TYPE_GITLAB,
  CODESTAR_CONNECTION_PROVIDER_TYPE_GITLAB_SELF_MANAGED,
] as const;

export async function listCodeStarConnections(_config: SiteOMaticConfig, region: string): Promise<Array<Connection>> {
  const client = new CodeStarConnectionsClient({ region });

  const cmd1 = new ListConnectionsCommand({});
  const response = await client.send(cmd1);

  if (!response?.Connections) return [];

  return response.Connections.filter(({ ConnectionName }) => ConnectionName?.startsWith('som-'));
}

export async function addCodeStarConnection(
  config: SiteOMaticConfig,
  region: string,
  connectionName: string,
  providerType: ProviderType
) {
  const client = new CodeStarConnectionsClient({ region });

  const cmd1 = new CreateConnectionCommand({
    ProviderType: providerType,
    ConnectionName: `som-${connectionName}`,
    Tags: [{ Key: config.SOM_TAG_NAME, Value: config.SOM_TAG_NAME }],
  });
  await client.send(cmd1);

  return listCodeStarConnections(config, region);
}

export async function deleteCodeStarConnection(config: SiteOMaticConfig, region: string, connectionArn: string) {
  const client = new CodeStarConnectionsClient({ region });

  const cmd1 = new DeleteConnectionCommand({
    ConnectionArn: connectionArn,
  });
  await client.send(cmd1);

  return listCodeStarConnections(config, region);
}
