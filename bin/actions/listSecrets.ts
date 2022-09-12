import type Vorpal from 'vorpal';

import * as secretsmanager from '../../lib/aws/secretsmanager';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { tabulate } from '../../lib/ui/tables';

export function actionListSecrets(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.listSomSecrets(config, DEFAULT_AWS_REGION);
    state.spinner.stop();

    vorpal.log(tabulate(data, ['Name']));
  };
}
