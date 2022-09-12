import chalk from 'chalk';
import * as dns from 'dns';

import {
  SOM_STATUS_BREADCRUMB,
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
  SOM_STATUS_HOSTED_ZONE_OK,
  SOM_STATUS_NOT_STARTED,
  SOM_STATUS_SITE_FUNCTIONAL,
  SSM_PARAM_NAME_HOSTED_ZONE_ID,
} from './consts';
import type { SomState, SomStatus } from './types';
import { getParam } from './utils';

export async function getSomTxtRecordViaDns(rootDomain?: string): Promise<string | undefined> {
  if (!rootDomain) return undefined;

  try {
    const records = await dns.promises.resolveTxt(`_som.${rootDomain}`);
    if (records?.[0]) {
      return records[0][0];
    }
    return undefined;
  } catch (ex) {
    return undefined;
  }
}

export function getStatus(state: SomState): SomStatus {
  const hasHostedZoneNameServers = getParam(state, 'hosted-zone-name-servers');
  const hostedZoneId = getParam(state, SSM_PARAM_NAME_HOSTED_ZONE_ID);
  const hostedZoneConfigOk =
    state.verificationTxtRecordViaDns && state.verificationTxtRecordViaDns === hostedZoneId && hasHostedZoneNameServers;
  const needsCloudfrontDist = !!state.manifest.webHosting;
  const hasCloudfrontDistId = !!getParam(state, 'cloudfront-distribution-id');
  const needsCodePipeline = !!state.manifest.pipeline;
  const hasCodePipelineArn = !!getParam(state, 'code-pipeline-arn');

  if (!hostedZoneId) return SOM_STATUS_NOT_STARTED;
  if (!hostedZoneConfigOk) return SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG;
  if (!needsCloudfrontDist && !needsCodePipeline) return SOM_STATUS_SITE_FUNCTIONAL;
  if (needsCodePipeline) {
    if (hasCodePipelineArn && (state.connectionStatus?.statusCode ?? 0) > 0) {
      return SOM_STATUS_SITE_FUNCTIONAL;
    }
    return SOM_STATUS_HOSTED_ZONE_OK;
  }
  if (needsCloudfrontDist) {
    if (hasCloudfrontDistId && (state.connectionStatus?.statusCode ?? 0) > 0) {
      return SOM_STATUS_SITE_FUNCTIONAL;
    }
    return SOM_STATUS_HOSTED_ZONE_OK;
  }

  return SOM_STATUS_NOT_STARTED;
}

export function getStatusMessage(state: SomState, status: SomStatus): string {
  if (status === SOM_STATUS_NOT_STARTED) {
    return 'Deploy the site to setup the HostedZone.';
  }
  if (status === SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG) {
    if (state.registrar) {
      if (state.nameserversSet) {
        return 'Waiting for nameserver propagation. Refresh the info periodically.';
      }
      return 'Set the nameservers with the registrar: `> set nameservers`.';
    }
    return 'You must manually set the nameservers with your registrar. This may take a while to take effect.';
  }
  if (status === SOM_STATUS_HOSTED_ZONE_OK) {
    const needsCloudfrontDist = !!state.manifest.webHosting;
    const hasCloudfrontDistId = !!getParam(state, 'cloudfront-distribution-id');
    const needsCodePipeline = !!state.manifest.pipeline;
    const hasCodePipelineArn = !!getParam(state, 'code-pipeline-arn');

    if (needsCodePipeline && hasCodePipelineArn && state.connectionStatus?.statusCode !== 200) {
      return 'Make sure that content has been pushed to the site git repo. Consider triggering the pipeline with: `> trigger pipeline`';
    }
    if (needsCloudfrontDist && hasCloudfrontDistId && state.connectionStatus?.statusCode !== 200) {
      return 'Make sure that content has been pushed to your S3 bucket www folder';
    }
    return 'Deploy the site to create the resources which are still needed.';
  }
  if (state.protectedSsm !== state.protectedManifest) {
    return 'The protected flag differs in the manifest. Deploy the site to make this take effect.';
  }
  return '';
}

export function formatStatus(status: SomStatus): string {
  switch (status) {
    case SOM_STATUS_NOT_STARTED:
      return chalk.red(status);
    case SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG:
      return chalk.yellowBright(status);
    case SOM_STATUS_HOSTED_ZONE_OK:
      return chalk.yellowBright(status);
    case SOM_STATUS_SITE_FUNCTIONAL:
      return chalk.bold(chalk.greenBright(status));
  }
}

export function formatStatusBreadCrumb(status: SomStatus): string {
  return [...SOM_STATUS_BREADCRUMB].map((s) => (s === status ? formatStatus(s) : chalk.grey(s))).join(' > ');
}

export function formatStatusBreadCrumbAndMessage(status: SomStatus, statusMessage: string): string {
  const breadCrumb = formatStatusBreadCrumb(status);

  return `${breadCrumb}\n\n${chalk.hex('#0075bd')(chalk.bold(statusMessage))}`;
}
