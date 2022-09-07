import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import type { SomConfig, SomState } from '../../lib/consts';

export function actionCloneCertificatesManual(vorpal: Vorpal, _: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest || !state.pathToManifestFile) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    const response = await vorpal.activeCommand.prompt({
      type: 'input',
      name: 'confirm',
      message: chalk.green(
        `Are you sure you want to clone certificates: ${chalk.bold(state.somId)} under user ${chalk.bold(
          args.username
        )}? [y/n] `
      ),
    });
    if (response.confirm === 'y') {
      await cdkExec.cdkDeploy(vorpal, state.somId, {
        pathToManifestFile: state.pathToManifestFile,
        iamUsername: args.username,
        deploySubdomainCerts: 'true',
        cloneCertificates: 'true',
      });
    } else {
      vorpal.log('Aborted');
    }
  };
}
