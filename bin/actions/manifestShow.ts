import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { hasManifest } from '../../lib/context';
import { verror } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionManifestShow(vorpal: Vorpal, _: SiteOMaticConfig, state: SomGlobalState) {
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
