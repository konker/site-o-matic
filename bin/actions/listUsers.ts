import type Vorpal from 'vorpal';

import * as iam from '../../lib/aws/iam';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { vtabulate } from '../../lib/ui/logging';

export function actionListUsers(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await iam.listSomUsers(config, DEFAULT_AWS_REGION);
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['UserName']);
  };
}
