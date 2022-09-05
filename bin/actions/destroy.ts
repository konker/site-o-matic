import Vorpal from 'vorpal';
import { SomConfig, SomState } from '../../lib/consts';
import { getParam } from '../../lib/utils';
import chalk from 'chalk';
import { removeVerificationCnameRecord } from '../../lib/aws/route53';
import * as cdkExec from '../../lib/aws/cdkExec';

export function actionDestroy(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest || !state.pathToManifestFile) {
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
      await removeVerificationCnameRecord(config, getParam(state, 'hosted-zone-id') as string);
      await cdkExec.cdkDestroy(vorpal, state.pathToManifestFile, state.somId, {
        pathToManifestFile: state.pathToManifestFile,
        iamUsername: args.username,
        deploySubdomainCerts: 'true',
      });
    } else {
      vorpal.log('Aborted');
    }
  };
}
