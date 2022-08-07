import Vorpal from 'vorpal';
import { CLS, SomState } from '../../lib/consts';

export function actionClearScreen(vorpal: Vorpal, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    vorpal.log(CLS);
  };
}
