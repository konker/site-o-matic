import type Vorpal from 'vorpal';

import { CLS } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';

export function actionClearScreen(vorpal: Vorpal, _: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    state.spinner.stop();
    vorpal.log(CLS);
  };
}
