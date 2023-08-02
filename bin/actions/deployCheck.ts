import chalk from 'chalk';
import type Vorpal from 'vorpal';

import { preDeploymentCheck } from '../../lib/deployment';
import type { SomConfig } from '../../lib/types';
import type { SomGlobalState } from '../SomGlobalState';

export function actionDeployCheck(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args): Promise<void> => {
    const checkItems = await preDeploymentCheck(config, state.context, args.username);
    const checksPassed = checkItems.every((checkItem) => checkItem.passed);

    if (state.plumbing) {
      vorpal.log(JSON.stringify({ context: state.context, checkItems, checksPassed }));
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
