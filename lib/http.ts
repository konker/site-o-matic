import got from 'got';

import { UNKNOWN } from './consts';
import type { WwwConnectionStatus } from './types';

export const TYPICAL_BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/114.0',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  DNT: '1',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'cross-site',
};

export async function getSiteConnectionStatus(
  rootDomain: string | undefined,
  siteUrl: string | undefined
): Promise<WwwConnectionStatus> {
  if (!rootDomain || !siteUrl) {
    return {
      statusCode: -1,
      statusMessage: 'NO URL',
      timing: -1,
    };
  }

  try {
    const response = await got(siteUrl, {
      timeout: 1000,
      http2: false,
      headers: {
        Host: rootDomain,
        ...TYPICAL_BROWSER_HEADERS,
      },
    });
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
