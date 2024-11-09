import type Vorpal from 'vorpal';

import * as cdkTfExec from '../../lib/cdkTfExec';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { hasManifest } from '../../lib/context';
import { verror } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionSynthesize(vorpal: Vorpal, _: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    if (!hasManifest(state.context)) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    const [code, log] = await cdkTfExec.cdkSynth(
      vorpal,
      state.context.somId,
      { pathToManifestFile: state.context.pathToManifestFile },
      state.plumbing
    );

    if (state.plumbing) {
      vorpal.log(JSON.stringify({ context: state.context, code, log }));
    }
  };
}
