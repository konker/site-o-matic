import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import * as secrets from '../../lib/secrets';
import type { SomGlobalState } from '../SomGlobalState';

export function actionShowSecret(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    state.spinner.start();
    const data = await secrets.getSomSecret(config, DEFAULT_AWS_REGION, state.context.somId, args.name);
    state.spinner.stop();

    vorpal.log(`Name: ${data?.name}`);
    vorpal.log(`Secret: ${data?.value}`);
  };
}
