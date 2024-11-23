import type Vorpal from 'vorpal';

import * as iam from '../../lib/aws/iam';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

/**
  @deprecated
*/
export function actionListUsers(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    state.spinner.start();
    const data = await iam.listSomUsers(config, state.context.manifest?.region ?? config.AWS_REGION_CONTROL_PLANE);
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['UserName']);
  };
}
