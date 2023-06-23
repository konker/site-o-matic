import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as codestar from '../../lib/aws/codestar';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { tabulate } from '../../lib/ui/tables';

export function actionDeleteCodeStarConnection(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    const response = await vorpal.activeCommand.prompt({
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
      vorpal.log(tabulate(data, ['ConnectionName', 'ConnectionArn', 'ProviderType', 'ConnectionStatus']));
    } else {
      vorpal.log('Aborted');
    }
  };
}
