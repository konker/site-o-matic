import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { CLS } from '../../lib/consts';
import type { SomGlobalState } from '../SomGlobalState';

export function actionClearScreen(vorpal: Vorpal, _: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    if (state.plumbing) return;

    state.spinner.stop();
    vorpal.log(CLS);
  };
}
