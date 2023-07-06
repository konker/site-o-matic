import chalk from 'chalk';
import type Vorpal from 'vorpal';

import { preDeploymentCheck } from '../../lib/deployment';
import type { SomConfig, SomState } from '../../lib/types';

export function actionDeployCheck(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    const checkItems = await preDeploymentCheck(config, state, args.username);
    const checksPassed = checkItems.every((checkItem) => checkItem.passed);

    if (state.plumbing) {
      vorpal.log(JSON.stringify({ state, checkItems, checksPassed }, undefined, 2));
    } else {
      for (const checkItem of checkItems) {
        vorpal.log(
          checkItem.passed
            ? chalk.green(`✔ ${checkItem.name}: ${checkItem.message ?? 'OK'}`)
            : chalk.red(`✘ ${checkItem.name}: ${checkItem.message ?? 'FAILED'}`)
        );
      }
      vorpal.log('\n');
    }
  };
}
