import type Vorpal from 'vorpal';

import type { SomGlobalState } from '../SomGlobalState';

export function actionDummy(vorpal: Vorpal, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    vorpal.log(JSON.stringify({ context: state.context, args }));
  };
}
