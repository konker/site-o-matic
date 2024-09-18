import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import type { SomGlobalState } from '../SomGlobalState';

export function actionShowContext(vorpal: Vorpal, _: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    if (state.plumbing) {
      vorpal.log(JSON.stringify({ context: state.context, data: {} }));
    } else {
      vorpal.log(JSON.stringify(state.context, undefined, 2));
    }
  };
}
