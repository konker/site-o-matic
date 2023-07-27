import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import type { SomConfig, SomState } from '../../lib/types';
import { isLoaded } from '../../lib/types';
import { verror } from '../../lib/ui/logging';

export function actionSynthesize(vorpal: Vorpal, _: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!isLoaded(state)) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    const [code, log] = await cdkExec.cdkSynth(
      vorpal,
      state.somId,
      {
        pathToManifestFile: state.pathToManifestFile,
        iamUsername: args.username,
        deploySubdomainCerts: 'true',
      },
      state.plumbing
    );

    if (state.plumbing) {
      vorpal.log(JSON.stringify({ state, code, log }));
    }
  };
}
