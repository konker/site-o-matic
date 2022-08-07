import Vorpal from 'vorpal';
import { SomState } from '../../lib/consts';

export function actionDummy(vorpal: Vorpal, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    vorpal.log(JSON.stringify(args, undefined, 2));
  };
}
