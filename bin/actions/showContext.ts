import type Vorpal from 'vorpal';

import type { SomGlobalState } from '../../lib/SomGlobalState';
import type { SomConfig } from '../../lib/types';

export function actionShowContext(vorpal: Vorpal, _: SomConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args): Promise<void> => {
    if (state.plumbing) {
      vorpal.log(JSON.stringify({ context: state.context, data: {} }));
    } else {
      vorpal.log(JSON.stringify(state.context, undefined, 2));
    }
  };
}
