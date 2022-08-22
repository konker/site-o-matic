import Vorpal from 'vorpal';
import { CLS, SomConfig, SomState } from '../../lib/consts';

export function actionClearScreen(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    vorpal.log(CLS);
  };
}
