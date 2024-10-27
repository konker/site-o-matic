import assert from 'assert';
import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import { postToSnsTopic } from '../../lib/aws/sns';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import {
  BOOTSTRAP_STACK_ID,
  SITE_RESOURCES_STACK_ID,
  SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN,
} from '../../lib/consts';
import { hasManifest, refreshContextPass1, refreshContextPass2 } from '../../lib/context';
import { preDeploymentCheck } from '../../lib/deployment';
import { siteOMaticRules } from '../../lib/rules/site-o-matic.rules';
import { verror } from '../../lib/ui/logging';
import { getContextParam } from '../../lib/utils';
import type { SomGlobalState } from '../SomGlobalState';

export function actionDeploy(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    /*[XXX]
    const username = args.username ?? getContextParam(state.context, SSM_PARAM_NAME_DOMAIN_USER_NAME);
    if (!username) {
      const errorMessage = `ERROR: no username was resolved`;
      verror(vorpal, state, errorMessage);
      return;
    }
    */

    if (!state.plumbing) {
      vorpal.log('Pre-flight checks...');
    }
    const checkItems = await preDeploymentCheck(config, state.context);
    const checksPassed = checkItems.every((checkItem) => checkItem.passed);

    if (!state.plumbing) {
      for (const checkItem of checkItems) {
        vorpal.log(
          checkItem.passed
            ? chalk.green(`✔ ${checkItem.name}: ${checkItem.message ?? 'OK'}`)
            : chalk.red(`✘ ${checkItem.name}: ${checkItem.message ?? 'FAILED'}`)
        );
      }
      vorpal.log('\n');
    }

    if (!checksPassed) {
      const errorMessage = 'Deployment aborted due to failed checks';
      verror(vorpal, state, errorMessage);
      return;
    }

    // Assert not-null for types, even though these have been checked
    assert(hasManifest(state.context), 'absurd');
    assert(state.context.manifest, 'absurd');
    assert(state.context.pathToManifestFile, 'absurd');
    const facts = await siteOMaticRules(state.context);

    const response1 = state.yes
      ? { confirm: 'y' }
      : await vorpal.activeCommand.prompt({
          type: 'input',
          name: 'confirm',
          message: chalk.green(
            `${
              facts.shouldDeployS3Content ? chalk.cyan('NOTE: content will be uploaded to the S3 bucket.\n') : ''
            }Are you sure you want to deploy site: ${chalk.bold(state.context.somId)}? [y/N] `
          ),
        });
    if (response1.confirm !== 'y') {
      verror(vorpal, state, 'Aborted');
      return;
    }

    if (false /*[XXX]facts.shouldDeployCertificateClones*/) {
      const response2 = state.yes
        ? { confirm: 'y' }
        : await vorpal.activeCommand.prompt({
            type: 'input',
            name: 'confirm',
            message: chalk
              .yellow
              // [FIXME: what is this again? approve on the target account? Could have better explanation, and/or link to eventual docs here?]
              // No footprint in target account
              // Certificate clones are pending validation in som-production account
              // Need to click `Create DNS records in Amazon Route 53` button in the AWS Certificate Manager console
              //
              // [FIXME: this should also inform that the tool basically hangs until the certificate clones are validated]
              // [TODD: is it possible for the tool to detect this kind of hanging, and periodically prompt the user to perform validation?]
              /*[XXX]
              `WARNING!: Manual action needed to clone certificates into ${state.context.manifest?.certificate?.clones
                ?.map((i) => i.name)
                ?.join(',')}. Proceed? [y/N] `
               */
              (),
          });
      if (response2.confirm !== 'y') {
        verror(vorpal, state, 'Aborted');
        return;
      }
    }

    // Engage
    try {
      const [codeBootstrap, logBootstrap] = await cdkExec.cdkDeploy(
        vorpal,
        state.context.somId,
        {
          pathToManifestFile: state.context.pathToManifestFile,
        },
        state.plumbing,
        BOOTSTRAP_STACK_ID(state.context.somId)
      );
      if (state.plumbing) {
        vorpal.log(JSON.stringify({ context: state.context, codeBootstrap, logBootstrap }));
      }

      const [codeSiteResources, logSiteResources] = await cdkExec.cdkDeploy(
        vorpal,
        state.context.somId,
        {
          pathToManifestFile: state.context.pathToManifestFile,
        },
        state.plumbing,
        SITE_RESOURCES_STACK_ID(state.context.somId)
      );
      if (state.plumbing) {
        vorpal.log(JSON.stringify({ context: state.context, codeSiteResources, logSiteResources }));
      }

      const contextPass1 = await refreshContextPass1(config, state.context);
      const facts = await siteOMaticRules(contextPass1);
      const context = await refreshContextPass2(contextPass1, facts);
      state.updateContext(context);

      if (facts.hasNotificationsSnsTopic && facts.isSnsNotificationsEnabled) {
        const resp = await postToSnsTopic(
          getContextParam(state.context, SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN) as string,
          {
            somId: state.context.somId,
            message: 'Site-O-Matic deployment completed',
            codeSiteResources,
          }
        );
        if (resp) {
          vorpal.log(`Posted notification to SNS topic: ${resp}`);
        }
      }
    } catch (ex: any) {
      verror(vorpal, state, ex);
      if (facts.hasNotificationsSnsTopic && facts.isSnsNotificationsEnabled) {
        const resp = await postToSnsTopic(
          getContextParam(state.context, SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN) as string,
          {
            somId: state.context.somId,
            message: 'Site-O-Matic deployment failed',
            code: -1,
            error: ex,
          }
        );
        if (resp) {
          vorpal.log(`Posted notification to SNS topic: ${resp}`);
        }
      }
    }
  };
}
