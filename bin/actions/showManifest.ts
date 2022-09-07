import type Vorpal from 'vorpal';

import type { SomConfig, SomState } from '../../lib/consts';

export function actionShowManifest(vorpal: Vorpal, _: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }
    vorpal.log(JSON.stringify(state.manifest, undefined, 2));
  };
}
