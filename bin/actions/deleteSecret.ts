import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { DEFAULT_AWS_REGION, GLOBAL_SECRETS_SCOPE } from '../../lib/consts';
import * as secrets from '../../lib/secrets';
import { SECRETS_SOURCE_SECRETS_MANAGER } from '../../lib/secrets/types';
import { vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionDeleteSecret(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    state.spinner.start();
    const data = await secrets.deleteSomSecret(
      config,
      DEFAULT_AWS_REGION,
      SECRETS_SOURCE_SECRETS_MANAGER,
      state.context.somId ?? GLOBAL_SECRETS_SCOPE,
      args.name
    );
    state.spinner.stop();

    vtabulate(
      vorpal,
      state,
      data.map((x) => ({ Name: x })),
      ['Name']
    );
  };
}
