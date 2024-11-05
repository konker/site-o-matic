import type Vorpal from 'vorpal';

import * as iam from '../../lib/aws/iam';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionAddUser(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    state.spinner.start();
    // FIXME: config default region
    const data = await iam.addSomUser(config, config.AWS_REGION_CONTROL_PLANE, args.username);
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['UserName'], ['UserName']);
  };
}
