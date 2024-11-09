import { CloudFormationClient, ListExportsCommand } from '@aws-sdk/client-cloudformation';

import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';

// ----------------------------------------------------------------------
export type CloudFormationExport = {
  readonly name: string;
  readonly value: string;
};

export async function getCloudformationExports(
  _config: SiteOMaticConfig,
  region: string
): Promise<Array<CloudFormationExport>> {
  const client = new CloudFormationClient({ region });

  async function _fetchCloudformationExports(
    nextToken: string | undefined = undefined
  ): Promise<Array<CloudFormationExport>> {
    const cmd1 = new ListExportsCommand(Object.assign({}, nextToken ? { NextToken: nextToken } : {}));

    const result = await client.send(cmd1);
    if (!result?.Exports) return [];

    const exports = result.Exports.reduce((acc, { Name, Value }) => {
      if (Name)
        return acc.concat({
          name: Name,
          value: Value ?? '',
        });
      return acc;
    }, [] as Array<CloudFormationExport>);

    if (result.NextToken) {
      return exports.concat(await _fetchCloudformationExports(result.NextToken));
    }
    return exports;
  }

  const ret = await _fetchCloudformationExports();

  return ret.sort((a, b) => a.name.localeCompare(b.name));
}

// ----------------------------------------------------------------------
export async function getCloudformationExport(
  config: SiteOMaticConfig,
  region: string,
  name: string
): Promise<CloudFormationExport | undefined> {
  const exports = await getCloudformationExports(config, region);
  return exports?.find((x) => x.name === name);
}
