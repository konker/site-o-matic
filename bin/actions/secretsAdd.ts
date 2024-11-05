import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { GLOBAL_SECRETS_SCOPE } from '../../lib/consts';
import * as secrets from '../../lib/secrets';
import { DEFAULT_SECRETS_SOURCE } from '../../lib/secrets/types';
import { vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionAddSecret(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    state.spinner.start();
    const data = await secrets.addSomSecret(
      config,
      state.context.manifest?.region ?? config.AWS_REGION_CONTROL_PLANE,
      state.context.somId ?? GLOBAL_SECRETS_SCOPE,
      DEFAULT_SECRETS_SOURCE,
      state.context.somId ?? GLOBAL_SECRETS_SCOPE,
      args.name,
      args.value
    );
    state.spinner.stop();

    vtabulate(
      vorpal,
      state,
      data.map((x) => ({ Name: x })),
      ['Name'],
      ['Name'],
      false,
      [60]
    );
  };
}
