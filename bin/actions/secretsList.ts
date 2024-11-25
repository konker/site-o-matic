import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { SECRETS_SCOPE_GLOBAL, SECRETS_SCOPE_SITE } from '../../lib/consts';
import * as secrets from '../../lib/secrets';
import { vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionSecretsList(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    state.spinner.start();
    const data = await secrets.listSomSecretNames(
      config,
      state.context.manifest?.region ?? config.AWS_REGION_CONTROL_PLANE,
      state.context.somId
    );
    state.spinner.stop();

    vtabulate(
      vorpal,
      state,
      data.map((x) => ({
        Name: x.name,
        Scope: x.scope === SECRETS_SCOPE_GLOBAL ? SECRETS_SCOPE_GLOBAL : SECRETS_SCOPE_SITE,
        Source: x.source,
      })),
      ['Name', 'Scope', 'Source'],
      ['Name', 'Scope', 'Source'],
      false,
      [50, 10, 10]
    );
  };
}
