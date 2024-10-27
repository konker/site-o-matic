import {
  DeleteParameterCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
  ParameterType,
  PutParameterCommand,
  SSMClient,
} from '@aws-sdk/client-ssm';

import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';
import type { SomParam } from '../types';
import { assumeSomRole } from './sts';

// --------------------------------------------------------------------------
export function ssmBasePath(config: SiteOMaticConfig, somId: string): string {
  return `/params/${config.SOM_PREFIX}/${somId}`;
}

export function toSsmParamName(config: SiteOMaticConfig, somId: string, name: string, ...extra: Array<string>) {
  const extra_ = extra.filter((i) => i !== undefined && i !== null && i !== '');
  return `${ssmBasePath(config, somId)}/${name}` + (extra_.length > 0 ? '/' + extra_.join('/') : '');
}

// --------------------------------------------------------------------------
export async function getSsmParams(config: SiteOMaticConfig, region: string, path: string): Promise<Array<SomParam>> {
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
    if (!result?.Parameters) return [];

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

// --------------------------------------------------------------------------
export async function getSsmParam(
  config: SiteOMaticConfig,
  region: string,
  paramName: string
): Promise<string | undefined> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SSMClient({ region, credentials: somRoleCredentials });
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

// --------------------------------------------------------------------------
export async function createSsmParam(
  config: SiteOMaticConfig,
  region: string,
  somId: string,
  paramName: string,
  value: string,
  secure = false
): Promise<void> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SSMClient({ region, credentials: somRoleCredentials });

  try {
    const cmd1 = new PutParameterCommand({
      Name: paramName,
      Value: value,
      Type: secure ? ParameterType.SECURE_STRING : ParameterType.STRING,
      Tags: [{ Key: config.SOM_TAG_NAME, Value: somId }],
    });

    await client.send(cmd1);
  } catch (ex: any) {
    return undefined;
  }
}

// --------------------------------------------------------------------------
export async function deleteSsmParam(config: SiteOMaticConfig, region: string, paramName: string): Promise<void> {
  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new SSMClient({ region, credentials: somRoleCredentials });
  try {
    const cmd1 = new DeleteParameterCommand({
      Name: paramName,
    });

    await client.send(cmd1);
  } catch (ex: any) {
    return undefined;
  }
}
