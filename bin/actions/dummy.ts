import type Vorpal from 'vorpal';

import type { SomGlobalState } from '../../lib/SomGlobalState';

export function actionDummy(vorpal: Vorpal, state: SomGlobalState) {
  return async (args: Vorpal.Args): Promise<void> => {
    vorpal.log(JSON.stringify({ context: state.context, args }));
  };
}
