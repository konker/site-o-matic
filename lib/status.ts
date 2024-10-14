import chalk from 'chalk';

import {
  SOM_STATUS_BREADCRUMB,
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
  SOM_STATUS_HOSTED_ZONE_OK,
  SOM_STATUS_NOT_STARTED,
  SOM_STATUS_SITE_FUNCTIONAL,
  SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS,
} from './consts';
import type { SomFacts } from './rules/site-o-matic.rules';
import type { SomContext, SomStatus } from './types';

export function getStatus(facts: SomFacts): SomStatus {
  if (facts.isStatusNotStarted) return SOM_STATUS_NOT_STARTED;
  if (facts.isStatusSiteFunctional) return SOM_STATUS_SITE_FUNCTIONAL;
  if (facts.isStatusHostedZoneOk) return SOM_STATUS_HOSTED_ZONE_OK;
  if (facts.isStatusHostedZoneAwaitingNsConfig) return SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG;
  return SOM_STATUS_NOT_STARTED;
}

export function getStatusMessage(_context: SomContext, facts: SomFacts, status: SomStatus): string {
  if (status === SOM_STATUS_NOT_STARTED) {
    return 'Deploy the site to setup the HostedZone.';
  }
  if (status === SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG) {
    if (facts.hasRegistrarConfig) {
      if (facts.nameserversSetButNotPropagated) {
        return 'Waiting for nameserver propagation. Refresh the info periodically.';
      }
      return 'Set the nameservers with the registrar: `> set nameservers`.';
    }
    if (facts.dnsResolvedNameserversMatchHostedZoneNameServers && !facts.hostedZoneVerified) {
      return 'Waiting for DNS propagation. Refresh the info periodically.';
    }
    return `You must manually set the nameservers with your registrar.\nSee ${chalk.white(
      SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS
    )} property below.`;
  }
  if (status === SOM_STATUS_HOSTED_ZONE_OK) {
    if (facts.needsCloudfrontDist && facts.hasCloudfrontDistId && !facts.has200ConnectionStatus) {
      return 'Make sure that content has been pushed to your S3 bucket www folder';
    }
    return 'Deploy the site to create the resources which are still needed.';
  }
  if (facts.lockedSsm !== facts.lockedManifest) {
    return 'The locked flag differs in the manifest. Deploy the site to make this take effect.';
  }
  if (status === SOM_STATUS_SITE_FUNCTIONAL) {
    return 'Cowabunga!';
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
  return [...SOM_STATUS_BREADCRUMB].map((s) => (s === status ? formatStatus(s) : chalk.grey(s))).join('\n > ');
}

export function formatStatusBreadCrumbAndMessage(status: SomStatus, statusMessage: string): string {
  const breadCrumb = formatStatusBreadCrumb(status);

  return `${breadCrumb}\n\n${chalk.hex('#0075bd')(chalk.bold(statusMessage))}`;
}
