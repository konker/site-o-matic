import type Vorpal from 'vorpal';

import { CLS } from '../../lib/consts';
import type { SomConfig } from '../../lib/types';
import type { SomGlobalState } from '../SomGlobalState';

export function actionClearScreen(vorpal: Vorpal, _: SomConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    if (state.plumbing) return;

    state.spinner.stop();
    vorpal.log(CLS);
  };
}
