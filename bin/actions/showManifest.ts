import type Vorpal from 'vorpal';

import { hasManifest } from '../../lib/context';
import type { SomConfig } from '../../lib/types';
import { verror } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionShowManifest(vorpal: Vorpal, _: SomConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    if (!hasManifest(state.context)) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    if (state.plumbing) {
      vorpal.log(JSON.stringify({ context: state.context, data: state.context.manifest }));
    } else {
      vorpal.log(JSON.stringify(state.context.manifest, undefined, 2));
    }
  };
}
