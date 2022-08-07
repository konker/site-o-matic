import Vorpal from 'vorpal';
import { AWS_REGION, SomState } from '../../lib/consts';
import { getParam } from '../../lib/utils';
import chalk from 'chalk';
import { removeVerificationCnameRecord } from '../../lib/aws/route53';
import * as cdkExec from '../../lib/aws/cdkExec';

export function actionDestroy(vorpal: Vorpal, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }
    const username = getParam(state, 'domain-user-name');
    const response = await vorpal.activeCommand.prompt({
      type: 'input',
      name: 'confirm',
      message: chalk.red(
        `Are you sure you want to destroy site: ${chalk.bold(state.somId)} under user ${chalk.bold(username)}? [y/n] `
      ),
    });
    if (response.confirm === 'y') {
      await removeVerificationCnameRecord(AWS_REGION, getParam(state, 'hosted-zone-id') as string);
      await cdkExec.cdkDestroy(vorpal, state.pathToManifestFile, state.somId, username);
    } else {
      vorpal.log('Aborted');
    }
  };
}
