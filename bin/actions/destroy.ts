import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import { removeVerificationCnameRecords } from '../../lib/aws/route53';
import { SSM_PARAM_NAME_DOMAIN_USER_NAME, SSM_PARAM_NAME_HOSTED_ZONE_ID } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { verror } from '../../lib/ui/logging';
import { getParam } from '../../lib/utils';

export function actionDestroy(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest || !state.pathToManifestFile) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    const username = getParam(state, SSM_PARAM_NAME_DOMAIN_USER_NAME);
    const response = state.yes
      ? { confirm: 'y' }
      : await vorpal.activeCommand.prompt({
          type: 'input',
          name: 'confirm',
          message: chalk.red(
            `Are you sure you want to destroy site: ${chalk.bold(state.somId)} under user ${chalk.bold(
              username
            )}? [y/n] `
          ),
        });
    if (response.confirm === 'y') {
      // Check that the SSM protected status is set to 'false'
      if (state.protectedSsm === 'false') {
        await removeVerificationCnameRecords(config, getParam(state, SSM_PARAM_NAME_HOSTED_ZONE_ID) as string);
        const [code, log] = await cdkExec.cdkDestroy(
          vorpal,
          state.somId,
          {
            pathToManifestFile: state.pathToManifestFile,
            iamUsername: args.username,
            deploySubdomainCerts: 'true',
          },
          state.plumbing
        );
        if (state.plumbing) {
          vorpal.log(JSON.stringify({ state, code, log }));
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
