import type Vorpal from 'vorpal';

import { CLS } from '../../lib/consts';
import type { SomGlobalState } from '../../lib/SomGlobalState';
import type { SomConfig } from '../../lib/types';

export function actionClearScreen(vorpal: Vorpal, _: SomConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args): Promise<void> => {
    if (state.plumbing) return;

    state.spinner.stop();
    vorpal.log(CLS);
  };
}
