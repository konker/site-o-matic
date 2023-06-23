import got from 'got';

import { UNKNOWN } from './consts';
import type { WwwConnectionStatus } from './types';

export async function getSiteConnectionStatus(siteUrl?: string): Promise<WwwConnectionStatus> {
  if (!siteUrl) {
    return {
      statusCode: -1,
      statusMessage: 'NO URL',
      timing: -1,
    };
  }

  try {
    const response = await got(siteUrl, { timeout: 1000 });
    return {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage ?? UNKNOWN,
      timing: response.timings.phases.total ?? -1,
    };
  } catch (ex: any) {
    return {
      statusCode: -1,
      statusMessage: ex?.code ?? UNKNOWN,
      timing: ex.timings?.phases?.total ?? -1,
    };
  }
}
