import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import type { SomConfig, SomState } from '../../lib/consts';

export function actionDeploy(vorpal: Vorpal, _: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest || !state.pathToManifestFile) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    const response = await vorpal.activeCommand.prompt({
      type: 'input',
      name: 'confirm',
      message: chalk.green(
        `Are you sure you want to deploy site: ${chalk.bold(state.somId)} under user ${chalk.bold(
          args.username
        )}? [y/n] `
      ),
    });
    if (response.confirm === 'y') {
      try {
        await cdkExec.cdkDeploy(vorpal, state.somId, {
          pathToManifestFile: state.pathToManifestFile,
          iamUsername: args.username,
          deploySubdomainCerts: 'true',
        });
      } catch (ex: any) {
        vorpal.log(ex);
      }
    } else {
      vorpal.log('Aborted');
    }
  };
}
