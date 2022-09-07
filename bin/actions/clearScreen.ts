import type Vorpal from 'vorpal';

import type { SomConfig, SomState } from '../../lib/consts';
import { CLS } from '../../lib/consts';

export function actionClearScreen(vorpal: Vorpal, _: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    state.spinner.stop();
    vorpal.log(CLS);
  };
}
