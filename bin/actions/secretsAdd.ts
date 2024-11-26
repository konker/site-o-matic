import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { SECRETS_SCOPE_GLOBAL, SECRETS_SCOPE_SITE } from '../../lib/consts';
import * as secrets from '../../lib/secrets';
import { DEFAULT_SECRETS_SOURCE } from '../../lib/secrets/types';
import { vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionSecretsAdd(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    if (!args.value) {
      const value = await vorpal.activeCommand.prompt({
        type: 'password',
        name: 'secretValue',
        message: 'Enter secret value: ',
      });

      if (!value.secretValue || value.secretValue === '') {
        vorpal.log('Invalid secret value');
        return;
      }

      args.value = value.secretValue;
    }

    state.spinner.start();
    const data = await secrets.addSomSecret(
      config,
      state.context.manifest?.region ?? config.AWS_REGION_CONTROL_PLANE,
      state.context.somId ?? SECRETS_SCOPE_GLOBAL,
      DEFAULT_SECRETS_SOURCE,
      state.context.somId ?? SECRETS_SCOPE_GLOBAL,
      args.name,
      args.value
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
