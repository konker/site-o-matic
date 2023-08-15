import { GetParameterCommand, GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';

import type { SomConfig, SomParam } from '../types';
import { assumeSomRole } from './sts';

export function toSsmParamName(somId: string, name: string, ...extra: Array<string>) {
  return `/som/${somId}/${name}` + (extra.length > 0 ? '/' + extra.join('/') : '');
}

export async function getSsmParams(config: SomConfig, region: string, somId?: string): Promise<Array<SomParam>> {
  if (!somId) return [];
  const path = `/som/${somId}`;

  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SSMClient({
    region,
    credentials: somRoleCredentials,
  });

  async function _fetchSsmParams(nextToken: string | undefined = undefined): Promise<Array<SomParam>> {
    const cmd1 = new GetParametersByPathCommand(
      Object.assign(
        {
          Path: path,
          MaxResults: 10,
          Recursive: true,
        },
        nextToken ? { NextToken: nextToken } : {}
      )
    );

    const result = await client.send(cmd1);
    if (!result || !result.Parameters) return [];

    const params = result.Parameters.reduce((acc, { Name, Value }) => {
      if (Name)
        return acc.concat({
          Param: Name.slice(path.length + 1),
          Value: Value ?? '',
        });
      return acc;
    }, [] as Array<SomParam>);

    if (result.NextToken) {
      return params.concat(await _fetchSsmParams(result.NextToken));
    }
    return params;
  }

  const ret = await _fetchSsmParams();

  return ret.sort((a, b) => a.Param.localeCompare(b.Param));
}

export async function getSsmParam(region: string, paramName: string): Promise<string | undefined> {
  const client = new SSMClient({ region });
  try {
    const cmd1 = new GetParameterCommand({
      Name: paramName,
      WithDecryption: true,
    });

    const result = await client.send(cmd1);
    return result?.Parameter?.Value;
  } catch (ex: any) {
    return undefined;
  }
}

export async function getSomSsmParam(
  somId: string,
  region: string,
  name: string,
  ...extra: Array<string>
): Promise<string | undefined> {
  return getSsmParam(region, toSsmParamName(somId, name, ...extra));
}
