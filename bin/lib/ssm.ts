import * as AWS from 'aws-sdk';
import { SomParam } from '../../lib/consts';

export async function getSsmParams(region: string, somId?: string): Promise<Array<SomParam>> {
  if (!somId) return [];

  async function _fetchSsmParams(nextToken: string | undefined = undefined): Promise<Array<SomParam>> {
    AWS.config.update({ region });
    const ssm = new AWS.SSM();
    const path = `/som/${somId}`;

    const result = await ssm.getParametersByPath({ Path: path, MaxResults: 10, NextToken: nextToken }).promise();
    if (!result || !result.Parameters) return [];

    const params = result.Parameters.reduce((acc, { Name, Value }) => {
      if (Name) return acc.concat({ Param: Name.slice(path.length + 1), Value: Value || '' });
      return acc;
    }, [] as Array<SomParam>);

    if (result.NextToken) {
      return params.concat(await _fetchSsmParams(result.NextToken));
    }
    return params;
  }

  return _fetchSsmParams();
}
