import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import type { SomConfig, SomState } from '../../lib/types';

export function actionDeploy(vorpal: Vorpal, _: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest || !state.pathToManifestFile) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    const response1 = await vorpal.activeCommand.prompt({
      type: 'input',
      name: 'confirm',
      message: chalk.green(
        `Are you sure you want to deploy site: ${chalk.bold(state.somId)} under user ${chalk.bold(
          args.username
        )}? [y/n] `
      ),
    });
    if (response1.confirm !== 'y') {
      vorpal.log('Aborted');
      return;
    }

    if (state.certificateCloneNames?.length ?? 0 > 0) {
      const response2 = await vorpal.activeCommand.prompt({
        type: 'input',
        name: 'confirm',
        message: chalk.yellow(
          `WARNING!: Manual action needed to clone certificates into ${state.certificateCloneNames?.join(
            ','
          )}. Proceed? [y/n] `
        ),
      });
      if (response2.confirm !== 'y') {
        vorpal.log('Aborted');
        return;
      }
    }

    // Engage
    try {
      await cdkExec.cdkDeploy(vorpal, state.somId, {
        pathToManifestFile: state.pathToManifestFile,
        iamUsername: args.username,
        deploySubdomainCerts: 'true',
      });
    } catch (ex: any) {
      vorpal.log(ex);
    }
  };
}
