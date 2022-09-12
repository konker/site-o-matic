import type Vorpal from 'vorpal';

import type { SomState } from '../../lib/types';

export function actionDummy(vorpal: Vorpal, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    vorpal.log(JSON.stringify(args, undefined, 2));
    vorpal.log(JSON.stringify(state, undefined, 2));
  };
}
