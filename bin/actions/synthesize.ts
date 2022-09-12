import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import type { SomConfig, SomState } from '../../lib/types';

export function actionSynthesize(vorpal: Vorpal, _: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest || !state.pathToManifestFile) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    await cdkExec.cdkSynth(vorpal, state.somId, {
      pathToManifestFile: state.pathToManifestFile,
      iamUsername: args.username,
      deploySubdomainCerts: 'true',
    });
  };
}
