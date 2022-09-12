import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import { removeVerificationCnameRecords } from '../../lib/aws/route53';
import { SSM_PARAM_NAME_DOMAIN_USER_NAME, SSM_PARAM_NAME_HOSTED_ZONE_ID } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { getParam } from '../../lib/utils';

export function actionDestroy(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest || !state.pathToManifestFile) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }
    const username = getParam(state, SSM_PARAM_NAME_DOMAIN_USER_NAME);
    const response = await vorpal.activeCommand.prompt({
      type: 'input',
      name: 'confirm',
      message: chalk.red(
        `Are you sure you want to destroy site: ${chalk.bold(state.somId)} under user ${chalk.bold(username)}? [y/n] `
      ),
    });
    if (response.confirm === 'y') {
      // Check that the SSM protected status is set to 'false'
      if (state.protectedSsm === 'false') {
        await removeVerificationCnameRecords(config, getParam(state, SSM_PARAM_NAME_HOSTED_ZONE_ID) as string);
        await cdkExec.cdkDestroy(vorpal, state.somId, {
          pathToManifestFile: state.pathToManifestFile,
          iamUsername: args.username,
          deploySubdomainCerts: 'true',
        });
      } else {
        vorpal.log(
          chalk.red(
            "Deployed protected status is not set to 'false', cannot proceed.\nSet the protected property to `true` in the manifest and re-deploy."
          )
        );
      }
    } else {
      vorpal.log('Aborted');
    }
  };
}
