import assert from 'assert';
import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import { preDeploymentCheck } from '../../lib/deployment';
import type { SomConfig, SomState } from '../../lib/types';

export function actionDeploy(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    vorpal.log('Pre-flight checks...');
    const checkItems = await preDeploymentCheck(config, state, args.username);
    const checksPassed = checkItems.every((checkItem) => checkItem.passed);
    for (const checkItem of checkItems) {
      vorpal.log(
        checkItem.passed
          ? chalk.green(`✔ ${checkItem.name}: ${checkItem.message ?? 'OK'}`)
          : chalk.red(`✘ ${checkItem.name}: ${checkItem.message ?? 'FAILED'}`)
      );
    }
    vorpal.log('\n');

    if (!checksPassed) {
      vorpal.log(chalk.red('Deployment aborted due to failed checks'));
      return;
    }

    // Assert not-null for types, even though these have been checked
    assert(state.manifest, 'absurd');
    assert(state.pathToManifestFile, 'absurd');

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
