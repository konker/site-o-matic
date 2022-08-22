import Vorpal from 'vorpal';
import { SomConfig, SomState } from '../../lib/consts';

export function actionShowManifest(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }
    vorpal.log(JSON.stringify(state.manifest, undefined, 2));
  };
}
