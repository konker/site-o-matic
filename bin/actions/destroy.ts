import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import { removeVerificationCnameRecords } from '../../lib/aws/route53';
import { SSM_PARAM_NAME_DOMAIN_USER_NAME, SSM_PARAM_NAME_HOSTED_ZONE_ID } from '../../lib/consts';
import { hasNetworkDerived } from '../../lib/context';
import { siteOMaticRules } from '../../lib/rules/site-o-matic.rules';
import type { SomGlobalState } from '../../lib/SomGlobalState';
import type { SomConfig } from '../../lib/types';
import { verror } from '../../lib/ui/logging';
import { getContextParam } from '../../lib/utils';

export function actionDestroy(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!hasNetworkDerived(state.context)) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    const facts = await siteOMaticRules(state.context);
    const username = getContextParam(state.context, SSM_PARAM_NAME_DOMAIN_USER_NAME);
    const response = state.yes
      ? { confirm: 'y' }
      : await vorpal.activeCommand.prompt({
          type: 'input',
          name: 'confirm',
          message: chalk.red(
            `Are you sure you want to destroy site: ${chalk.bold(state.context.somId)} under user ${chalk.bold(
              username
            )}? [y/n] `
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
        if (state.plumbing) {
          vorpal.log(JSON.stringify({ context: state.context, code, log }));
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
