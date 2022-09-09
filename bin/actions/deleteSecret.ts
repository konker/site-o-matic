import type Vorpal from 'vorpal';

import * as secretsmanager from '../../lib/aws/secretsmanager';
import type { SomConfig, SomState } from '../../lib/consts';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import { tabulate } from '../../lib/ui/tables';

export function actionDeleteSecret(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.deleteSomSecret(config, DEFAULT_AWS_REGION, args.name);
    state.spinner.stop();

    vorpal.log(tabulate(data, ['Name']));
  };
}
