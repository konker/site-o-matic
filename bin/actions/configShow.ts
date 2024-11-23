import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import type { SomGlobalState } from '../SomGlobalState';

export function actionShowCOnfig(vorpal: Vorpal, _: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    if (state.plumbing) {
      vorpal.log(JSON.stringify({ config: state.config, data: {} }));
    } else {
      vorpal.log(JSON.stringify(state.config, undefined, 2));
    }
  };
}
