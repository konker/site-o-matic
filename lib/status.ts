import chalk from 'chalk';
import * as dns from 'dns';

import type { SomState, SomStatus } from './consts';
import {
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
  SOM_STATUS_HOSTED_ZONE_DEPLOYMENT_IN_PROGRESS,
  SOM_STATUS_HOSTED_ZONE_OK,
  SOM_STATUS_HOSTING_DEPLOYED,
  SOM_STATUS_HOSTING_DEPLOYMENT_IN_PROGRESS,
  SOM_STATUS_NOT_STARTED,
  SOM_STATUS_PIPELINE_DEPLOYED,
  SOM_STATUS_PIPELINE_DEPLOYMENT_IN_PROGRESS,
  SOM_STATUS_SITE_FUNCTIONAL,
  SSM_PARAM_NAME_HOSTED_ZONE_ID,
} from './consts';
import { getParam } from './utils';

export async function getSomTxtRecordViaDns(rootDomain?: string): Promise<string | undefined> {
  if (!rootDomain) return undefined;

  try {
    const records = await dns.promises.resolveTxt(`_som.${rootDomain}`);
    if (records && records[0]) {
      return records[0][0];
    }
    return undefined;
  } catch (ex) {
    return undefined;
  }
}

export async function getStatus(state: SomState): Promise<SomStatus> {
  const txtRecord = await getSomTxtRecordViaDns(state.rootDomain);
  if (getParam(state, 'code-pipeline-arn')) return SOM_STATUS_SITE_FUNCTIONAL;
  if (getParam(state, 'cloudfront-distribution-id')) return SOM_STATUS_HOSTING_DEPLOYED;
  if (txtRecord && getParam(state, SSM_PARAM_NAME_HOSTED_ZONE_ID) === txtRecord) return SOM_STATUS_HOSTED_ZONE_OK;
  if (txtRecord && getParam(state, SSM_PARAM_NAME_HOSTED_ZONE_ID) !== txtRecord)
    return SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG;
  if (!txtRecord && getParam(state, 'hosted-zone-name-servers')) return SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG;
  return SOM_STATUS_NOT_STARTED;
}

export function formatStatus(status: SomStatus): string {
  switch (status) {
    case SOM_STATUS_NOT_STARTED:
      return chalk.red(status);
    case SOM_STATUS_HOSTED_ZONE_DEPLOYMENT_IN_PROGRESS:
      return chalk.yellow(status);
    case SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG:
      return chalk.yellow(status);
    case SOM_STATUS_HOSTED_ZONE_OK:
      return chalk.green(status);
    case SOM_STATUS_HOSTING_DEPLOYMENT_IN_PROGRESS:
      return chalk.yellow(status);
    case SOM_STATUS_HOSTING_DEPLOYED:
      return chalk.red(status);
    case SOM_STATUS_PIPELINE_DEPLOYMENT_IN_PROGRESS:
      return chalk.yellow(status);
    case SOM_STATUS_PIPELINE_DEPLOYED:
      return chalk.green(status);
    case SOM_STATUS_SITE_FUNCTIONAL:
      return chalk.bold(chalk.greenBright(status));
  }
}
