import * as codestar from '../lib/aws/codestar';
import * as iam from './aws/iam';
import * as secretsmanager from './aws/secretsmanager';
import {
  DEFAULT_AWS_REGION,
  SITE_PIPELINE_TYPE_CODESTAR_NPM,
  SITE_PIPELINE_TYPE_CODESTAR_S3,
  SITE_PIPELINE_TYPES,
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
} from './consts';
import { CONTENT_PRODUCER_IDS } from './content';
import { getRegistrarConnector } from './registrar';
import type { SomConfig, SomState } from './types';

export type DeploymentCheckItem = {
  readonly name: string;
  readonly passed: boolean;
  readonly message: string | undefined;
};

export const checkPassed = (name: string, message?: string): DeploymentCheckItem => ({ name, passed: true, message });
export const checkFailed = (name: string, message?: string): DeploymentCheckItem => ({ name, passed: false, message });

export async function preDeploymentCheck(
  config: SomConfig,
  state: SomState,
  somUser: string
): Promise<Array<DeploymentCheckItem>> {
  const checkItems: Array<DeploymentCheckItem> = [];

  if (!state.manifest || !state.pathToManifestFile) {
    checkItems.push(checkFailed('Manifest Loaded'));
  } else {
    checkItems.push(checkPassed('Manifest Loaded'));
  }

  const somUsers = await iam.listSomUsers(config, DEFAULT_AWS_REGION);
  if (!somUsers.some((i) => i.UserName === somUser)) {
    checkItems.push(checkFailed('User', `User ${somUser} does not exist`));
  } else {
    checkItems.push(checkPassed('User'));
  }

  if (state.manifest.content?.producerId && !CONTENT_PRODUCER_IDS.includes(state.manifest.content.producerId)) {
    checkItems.push(checkFailed('Content Producer', `Must be one of: ${CONTENT_PRODUCER_IDS.join(', ')}`));
  } else {
    checkItems.push(checkPassed('Content Producer'));
  }

  if (state.manifest.pipeline && !SITE_PIPELINE_TYPES.includes(state.manifest.pipeline.type)) {
    checkItems.push(checkFailed('Pipeline Type', `Must be one of: ${SITE_PIPELINE_TYPES.join(', ')}`));
  } else {
    checkItems.push(checkPassed('Pipeline Type'));
  }

  if (state.manifest) {
    // Check codestar pipeline
    if (
      state.manifest.pipeline?.type === SITE_PIPELINE_TYPE_CODESTAR_S3 ||
      state.manifest.pipeline?.type === SITE_PIPELINE_TYPE_CODESTAR_NPM
    ) {
      const codestarConnections = await codestar.listCodeStarConnections(config, DEFAULT_AWS_REGION);
      const codestarConnection = codestarConnections.find(
        (i) => i.ConnectionArn === state.manifest.pipeline?.codestarConnectionArn
      );
      if (!codestarConnection || codestarConnection.ConnectionStatus !== 'AVAILABLE') {
        checkItems.push(checkFailed('Pipeline Arn', 'CodeStar connection does not exist, or is not AVAILABLE'));
      } else {
        checkItems.push(checkPassed('Pipeline Arn', 'CodeStar connection exists and is AVAILABLE'));
      }
    }
  }

  if (state.registrar) {
    const registrarConnector = getRegistrarConnector(state.registrar);
    const somSecrets = await secretsmanager.getSomSecrets(config, DEFAULT_AWS_REGION, registrarConnector.SECRETS);
    if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
      checkItems.push(
        checkFailed(
          'Registrar secrets',
          `Registrar ${state.registrar} requires missing secret(s): ${registrarConnector.SECRETS.join(', ')}`
        )
      );
    } else {
      checkItems.push(checkPassed('Registrar secrets'));
    }
  }

  if (state.status === SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG) {
    if (state.registrar) {
      if (state.nameserversSet) {
        checkItems.push(checkFailed('Nameservers', 'Waiting for nameserver propagation'));
      }
      checkItems.push(checkFailed('Nameservers', 'Set the nameservers with the registrar: `> set nameservers`.'));
    }
    checkItems.push(
      checkFailed(
        'Nameservers',
        'You must manually set the nameservers with your registrar. This may take a while to take effect.'
      )
    );
  } else {
    checkItems.push(checkPassed('Nameservers'));
  }

  return checkItems;
}
