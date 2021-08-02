import got from 'got';

export async function getSiteConnectionStatus(siteUrl?: string) {
  if (!siteUrl) {
    return {
      statusCode: 'ERROR',
      statusMessage: 'NO URL',
      timing: -1,
    };
  }

  try {
    const response = await got(siteUrl, { timeout: 1000 });
    return {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      timing: response.timings.phases.total,
    };
  } catch (ex) {
    return {
      statusCode: 'ERROR',
      statusMessage: ex?.code || 'UNKNOWN',
      timing: ex.timings?.phases?.total || -1,
    };
  }
}
