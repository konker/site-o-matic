import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as codestar from '../../lib/aws/codestar';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomGlobalState } from '../../lib/SomGlobalState';
import type { SomConfig } from '../../lib/types';
import { verror, vtabulate } from '../../lib/ui/logging';

export function actionDeleteCodeStarConnection(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args): Promise<void> => {
    const response = state.yes
      ? { confirm: 'y' }
      : await vorpal.activeCommand.prompt({
          type: 'input',
          name: 'confirm',
          message: chalk.red(
            `Are you sure you want to destroy codestar connection: ${chalk.bold(args.connectionArn)}? [y/n] `
          ),
        });
    if (response.confirm === 'y') {
      state.spinner.start();
      const data = await codestar.deleteCodeStarConnection(config, DEFAULT_AWS_REGION, args.connectionArn);
      state.spinner.stop();
      vtabulate(vorpal, state, data, ['ConnectionName', 'ConnectionArn', 'ProviderType', 'ConnectionStatus']);
    } else {
      verror(vorpal, state, 'Aborted');
    }
  };
}
