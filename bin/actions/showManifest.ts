import type Vorpal from 'vorpal';

import type { SomConfig, SomState } from '../../lib/types';
import { verror } from '../../lib/ui/logging';

export function actionShowManifest(vorpal: Vorpal, _: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    if (state.plumbing) {
      vorpal.log(JSON.stringify({ state, data: state.manifest }));
    } else {
      vorpal.log(JSON.stringify(state.manifest, undefined, 2));
    }
  };
}
