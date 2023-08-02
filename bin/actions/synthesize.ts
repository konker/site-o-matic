import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import { hasManifest } from '../../lib/context';
import type { SomConfig } from '../../lib/types';
import { verror } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionSynthesize(vorpal: Vorpal, _: SomConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!hasManifest(state.context)) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    const [code, log] = await cdkExec.cdkSynth(
      vorpal,
      state.context.somId,
      {
        pathToManifestFile: state.context.pathToManifestFile,
        iamUsername: args.username,
        deploySubdomainCerts: 'true',
      },
      state.plumbing
    );

    if (state.plumbing) {
      vorpal.log(JSON.stringify({ context: state.context, code, log }));
    }
  };
}
