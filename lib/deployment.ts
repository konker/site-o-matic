import chalk from 'chalk';

import type { SiteOMaticConfig } from './config/schemas/site-o-matic-config.schema';
import {
  SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG,
  SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS,
  VERSION,
  WEB_HOSTING_TYPE_CLOUDFRONT_S3,
  WEB_HOSTING_TYPE_NONE,
} from './consts';
import { hasManifest } from './context';
import { loadManifest } from './manifest';
import { getRegistrarConnector } from './registrar';
import { siteOMaticRules } from './rules/site-o-matic.rules';
import * as secrets from './secrets';
import { getStatus } from './status';
import type { SomContext } from './types';

export type DeploymentCheckItem = {
  readonly name: string;
  readonly passed: boolean;
  readonly message: string | undefined;
};

export const checkPassed = (name: string, message?: string): DeploymentCheckItem => ({ name, passed: true, message });
export const checkFailed = (name: string, message?: string): DeploymentCheckItem => ({ name, passed: false, message });

export async function preDeploymentCheck(
  config: SiteOMaticConfig,
  context: SomContext
): Promise<Array<DeploymentCheckItem>> {
  const facts = await siteOMaticRules(context);
  const status = getStatus(facts);

  const checkItems: Array<DeploymentCheckItem> = [];

  if (!hasManifest(context)) {
    checkItems.push(checkFailed('Manifest Loaded'));

    // Short-circuit immediately as there's no point carrying on without a manifest
    return checkItems;
  } else {
    checkItems.push(checkPassed('Manifest Loaded'));
  }

  const manifestLoad = await loadManifest(config, context.pathToManifestFile);
  if (!manifestLoad) {
    checkItems.push(
      checkFailed('Manifest change', `The site-o-matic manifest has changed on disk. Re-load it before deployment.`)
    );
  } else {
    const [_, hash] = manifestLoad;
    if (hash !== context.manifestHash) {
      checkItems.push(
        checkFailed('Manifest change', `The site-o-matic manifest has changed on disk. Re-load it before deployment.`)
      );
    } else {
      checkItems.push(checkPassed('Manifest change'));
    }
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

  /*[XXX]
  if (context.manifest) {
    // Check codestar pipeline
    if (
      context.manifest.pipeline?.type === SITE_PIPELINE_TYPE_CODESTAR_S3 ||
      context.manifest.pipeline?.type === SITE_PIPELINE_TYPE_CODESTAR_CUSTOM
    ) {
      const codestarConnections = await codestar.listCodeStarConnections(config, AWS_REGION_CONTROL_PLANE);
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
  */

  const somSecrets = await secrets.getAllSomSecrets(config, context.manifest.region, context.somId);

  if (context.registrar) {
    const registrarConnector = getRegistrarConnector(context.registrar);
    if (!registrarConnector.SECRETS.every((secretName) => somSecrets.lookup[secretName])) {
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

  context.manifest?.webHosting?.forEach((webHostingClause) => {
    if (webHostingClause.type === WEB_HOSTING_TYPE_CLOUDFRONT_S3) {
      if (webHostingClause.auth) {
        if (
          ![webHostingClause.auth.usernameSecretName, webHostingClause.auth.passwordSecretName].every(
            (secretName) => somSecrets.lookup[secretName]
          )
        ) {
          checkItems.push(
            checkFailed(
              'WebHosting auth secrets',
              `WebHosting ${webHostingClause.domainName} requires missing secret(s)`
            )
          );
        } else {
          checkItems.push(checkPassed('WebHosting auth secrets'));
        }
      }
    }
  });

  if (
    context.manifest?.webHosting &&
    context.manifest.webHosting.length !==
      new Set(context.manifest.webHosting.filter((x) => x.type !== WEB_HOSTING_TYPE_NONE).map((x) => x.domainName)).size
  ) {
    checkItems.push(checkFailed('WebHosting unique domain names', 'WebHosting clauses must have unique domain names'));
  } else {
    checkItems.push(checkPassed('WebHosting unique domain names'));
  }

  if (context.manifest?.webHosting) {
    if (
      context.manifest.webHosting
        .filter((x) => x.type !== WEB_HOSTING_TYPE_NONE)
        .some((x) => x.waf?.enabled && (x.waf?.AWSManagedRules?.length ?? 0) === 0)
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
