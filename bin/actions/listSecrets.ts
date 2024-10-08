import type Vorpal from 'vorpal';

import * as secretsmanager from '../../lib/aws/secretsmanager';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import { vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionListSecrets(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.listSomSecrets(config, DEFAULT_AWS_REGION);
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['Name']);
  };
}
