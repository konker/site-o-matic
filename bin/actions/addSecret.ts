import type Vorpal from 'vorpal';

import * as secretsmanager from '../../lib/aws/secretsmanager';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { vtabulate } from '../../lib/ui/logging';

export function actionAddSecret(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.addSomSecret(config, DEFAULT_AWS_REGION, args.name, args.value);
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['Name']);
  };
}
