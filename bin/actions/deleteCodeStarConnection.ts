import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as codestar from '../../lib/aws/codestar';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import { verror, vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionDeleteCodeStarConnection(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    const response = state.yes
      ? { confirm: 'y' }
      : await vorpal.activeCommand.prompt({
          type: 'input',
          name: 'confirm',
          message: chalk.red(
            `Are you sure you want to destroy codestar connection: ${chalk.bold(args.connectionArn)}? [y/N] `
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
