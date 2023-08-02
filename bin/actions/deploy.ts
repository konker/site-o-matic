import assert from 'assert';
import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import { preDeploymentCheck } from '../../lib/deployment';
import { siteOMaticRules } from '../../lib/rules/site-o-matic.rules';
import type { SomConfig } from '../../lib/types';
import { verror } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionDeploy(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.plumbing) {
      vorpal.log('Pre-flight checks...');
    }
    const checkItems = await preDeploymentCheck(config, state.context, args.username);
    const checksPassed = checkItems.every((checkItem) => checkItem.passed);

    if (!state.plumbing) {
      for (const checkItem of checkItems) {
        vorpal.log(
          checkItem.passed
            ? chalk.green(`✔ ${checkItem.name}: ${checkItem.message ?? 'OK'}`)
            : chalk.red(`✘ ${checkItem.name}: ${checkItem.message ?? 'FAILED'}`)
        );
      }
      vorpal.log('\n');
    }

    if (!checksPassed) {
      const errorMessage = 'Deployment aborted due to failed checks';
      verror(vorpal, state, errorMessage);
      return;
    }

    // Assert not-null for types, even though these have been checked
    assert(state.context.manifest, 'absurd');
    assert(state.context.pathToManifestFile, 'absurd');

    const response1 = state.yes
      ? { confirm: 'y' }
      : await vorpal.activeCommand.prompt({
          type: 'input',
          name: 'confirm',
          message: chalk.green(
            `Are you sure you want to deploy site: ${chalk.bold(state.context.somId)} under user ${chalk.bold(
              args.username
            )}? [y/n] `
          ),
        });
    if (response1.confirm !== 'y') {
      verror(vorpal, state, 'Aborted');
      return;
    }

    if (state.context.certificateCloneNames?.length ?? 0 > 0) {
      const response2 = state.yes
        ? { confirm: 'y' }
        : await vorpal.activeCommand.prompt({
            type: 'input',
            name: 'confirm',
            message: chalk.yellow(
              `WARNING!: Manual action needed to clone certificates into ${state.context.certificateCloneNames?.join(
                ','
              )}. Proceed? [y/n] `
            ),
          });
      if (response2.confirm !== 'y') {
        verror(vorpal, state, 'Aborted');
        return;
      }
    }

    // Engage
    try {
      const [code, log] = await cdkExec.cdkDeploy(
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
    } catch (ex: any) {
      verror(vorpal, state, ex);
    }
  };
}
