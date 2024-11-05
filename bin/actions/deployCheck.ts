import chalk from 'chalk';
import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { preDeploymentCheck } from '../../lib/deployment';
import type { SomGlobalState } from '../SomGlobalState';

export function actionDeployCheck(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    const checkItems = await preDeploymentCheck(config, state.context);
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
