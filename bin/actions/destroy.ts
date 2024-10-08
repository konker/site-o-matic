import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import { removeVerificationCnameRecords } from '../../lib/aws/route53';
import { postToSnsTopic } from '../../lib/aws/sns';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import {
  SSM_PARAM_NAME_DOMAIN_USER_NAME,
  SSM_PARAM_NAME_HOSTED_ZONE_ID,
  SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN,
} from '../../lib/consts';
import { hasNetworkDerived, refreshContext } from '../../lib/context';
import { siteOMaticRules } from '../../lib/rules/site-o-matic.rules';
import { verror } from '../../lib/ui/logging';
import { getContextParam } from '../../lib/utils';
import type { SomGlobalState } from '../SomGlobalState';

export function actionDestroy(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    if (!hasNetworkDerived(state.context)) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    const facts = await siteOMaticRules(state.context);
    const username = args.username ?? getContextParam(state.context, SSM_PARAM_NAME_DOMAIN_USER_NAME);
    if (!username) {
      const errorMessage = `ERROR: no username was resolved`;
      verror(vorpal, state, errorMessage);
      return;
    }

    const response = state.yes
      ? { confirm: 'y' }
      : await vorpal.activeCommand.prompt({
          type: 'input',
          name: 'confirm',
          message: chalk.red(
            `Are you sure you want to destroy site: ${chalk.bold(state.context.somId)} under user ${chalk.bold(
              username
            )}? [y/N] `
          ),
        });
    if (response.confirm === 'y') {
      // Check that the SSM protected status is set to 'false'
      if (!facts.protectedSsm) {
        await removeVerificationCnameRecords(
          config,
          getContextParam(state.context, SSM_PARAM_NAME_HOSTED_ZONE_ID) as string
        );
        const [code, log] = await cdkExec.cdkDestroy(
          vorpal,
          state.context.somId,
          {
            pathToManifestFile: state.context.pathToManifestFile,
            iamUsername: args.username,
            deploySubdomainCerts: 'true',
          },
          state.plumbing
        );

        state.updateContext(await refreshContext(config, state.context));

        if (state.plumbing) {
          vorpal.log(JSON.stringify({ context: state.context, code, log }));
        }
        if (facts.hasNotificationsSnsTopic && facts.isSnsNotificationsEnabled) {
          await postToSnsTopic(getContextParam(state.context, SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN) as string, {
            somId: state.context.somId,
            message: 'Site-O-Matic deployment completed',
            code,
          });
        }
      } else {
        const errorMessage =
          "Deployed protected status is not set to 'false', cannot proceed.\nSet the protected property to `true` in the manifest and re-deploy.";
        verror(vorpal, state, errorMessage);
      }
    } else {
      verror(vorpal, state, 'Aborted');
    }
  };
}
