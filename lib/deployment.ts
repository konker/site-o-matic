import chalk from 'chalk';

import * as codestar from '../lib/aws/codestar';
import * as iam from './aws/iam';
import * as secretsmanager from './aws/secretsmanager';
import {
  DEFAULT_AWS_REGION,
  SITE_PIPELINE_TYPE_CODESTAR_CUSTOM,
  SITE_PIPELINE_TYPE_CODESTAR_S3,
  SITE_PIPELINE_TYPES,
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
  SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS,
  VERSION,
} from './consts';
import { hasManifest } from './context';
import { getRegistrarConnector } from './registrar';
import { siteOMaticRules } from './rules/site-o-matic.rules';
import { getStatus } from './status';
import type { SomConfig, SomContext } from './types';

export type DeploymentCheckItem = {
  readonly name: string;
  readonly passed: boolean;
  readonly message: string | undefined;
};

export const checkPassed = (name: string, message?: string): DeploymentCheckItem => ({ name, passed: true, message });
export const checkFailed = (name: string, message?: string): DeploymentCheckItem => ({ name, passed: false, message });

export async function preDeploymentCheck(
  config: SomConfig,
  context: SomContext,
  somUser: string
): Promise<Array<DeploymentCheckItem>> {
  const facts = await siteOMaticRules(context);
  const status = getStatus(facts);

  const checkItems: Array<DeploymentCheckItem> = [];

  if (!hasManifest(context)) {
    checkItems.push(checkFailed('Manifest Loaded'));
  } else {
    checkItems.push(checkPassed('Manifest Loaded'));
  }

  if (context.somVersion !== VERSION) {
    checkItems.push(
      checkFailed(
        'Site-O-Matic version',
        `Currently running version ${VERSION}, does not match deployment version ${context.somVersion}`
      )
    );
  } else {
    checkItems.push(checkPassed('Site-O-Matic version'));
  }

  const somUsers = await iam.listSomUsers(config, DEFAULT_AWS_REGION);
  if (!somUsers.some((i) => i.UserName === somUser)) {
    checkItems.push(checkFailed('User', `User ${somUser} does not exist`));
  } else {
    checkItems.push(checkPassed('User'));
  }

  if (context.manifest?.pipeline && !SITE_PIPELINE_TYPES.includes(context.manifest.pipeline.type)) {
    checkItems.push(checkFailed('Pipeline Type', `Must be one of: ${SITE_PIPELINE_TYPES.join(', ')}`));
  } else {
    checkItems.push(checkPassed('Pipeline Type'));
  }

  if (context.manifest) {
    // Check codestar pipeline
    if (
      context.manifest.pipeline?.type === SITE_PIPELINE_TYPE_CODESTAR_S3 ||
      context.manifest.pipeline?.type === SITE_PIPELINE_TYPE_CODESTAR_CUSTOM
    ) {
      const codestarConnections = await codestar.listCodeStarConnections(config, DEFAULT_AWS_REGION);
      const manifestCodestarConnection = context.manifest?.pipeline?.codestarConnectionArn;
      const codestarConnection = codestarConnections.find(
        (i) => manifestCodestarConnection && i.ConnectionArn === manifestCodestarConnection
      );
      if (!codestarConnection || codestarConnection.ConnectionStatus !== 'AVAILABLE') {
        checkItems.push(checkFailed('Pipeline Arn', 'CodeStar connection does not exist, or is not AVAILABLE'));
      } else {
        checkItems.push(checkPassed('Pipeline Arn', 'CodeStar connection exists and is AVAILABLE'));
      }
    }
  }

  if (context.registrar) {
    const registrarConnector = getRegistrarConnector(context.registrar);
    const somSecrets = await secretsmanager.getSomSecrets(config, DEFAULT_AWS_REGION, registrarConnector.SECRETS);
    if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
      checkItems.push(
        checkFailed(
          'Registrar secrets',
          `Registrar ${context.registrar} requires missing secret(s): ${registrarConnector.SECRETS.join(', ')}`
        )
      );
    } else {
      checkItems.push(checkPassed('Registrar secrets'));
    }
  }

  if (context.manifest?.webHosting?.waf) {
    if (
      context.manifest?.webHosting?.waf?.enabled &&
      (context.manifest?.webHosting?.waf?.AWSManagedRules?.length ?? 0) === 0
    ) {
      checkItems.push(checkFailed('WAF', 'WAF is enabled, but no AWS Managed Rules are configured'));
    } else {
      checkItems.push(checkPassed('WAF'));
    }
  }

  if (status === SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG) {
    if (context.registrar) {
      if (facts.nameserversSetButNotPropagated) {
        checkItems.push(checkFailed('Nameservers', 'Waiting for nameserver propagation'));
      }
      checkItems.push(checkFailed('Nameservers', 'Set the nameservers with the registrar: `> set nameservers`.'));
    }
    checkItems.push(
      checkFailed(
        'Nameservers',
        `You must manually set the nameservers with your registrar.\nSee ${chalk.white(
          SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS
        )} property above.`
      )
    );
  } else {
    checkItems.push(checkPassed('Nameservers'));
  }

  return checkItems;
}
