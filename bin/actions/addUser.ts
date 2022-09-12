import type Vorpal from 'vorpal';

import * as iam from '../../lib/aws/iam';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { tabulate } from '../../lib/ui/tables';

export function actionAddUser(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const users = await iam.addSomUser(config, DEFAULT_AWS_REGION, args.username);
    state.spinner.stop();

    vorpal.log(tabulate(users, ['UserName'], ['UserName']));
  };
}
