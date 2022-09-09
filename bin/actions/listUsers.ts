import type Vorpal from 'vorpal';

import * as iam from '../../lib/aws/iam';
import type { SomConfig, SomState } from '../../lib/consts';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import { tabulate } from '../../lib/ui/tables';

export function actionListUsers(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const users = await iam.listSomUsers(config, DEFAULT_AWS_REGION);
    state.spinner.stop();

    vorpal.log(tabulate(users, ['UserName']));
  };
}
