import type Vorpal from 'vorpal';

import * as secretsmanager from '../../lib/aws/secretsmanager';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomGlobalState } from '../../lib/SomGlobalState';
import type { SomConfig } from '../../lib/types';
import { vtabulate } from '../../lib/ui/logging';

export function actionDeleteSecret(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.deleteSomSecret(config, DEFAULT_AWS_REGION, args.name);
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['Name']);
  };
}
