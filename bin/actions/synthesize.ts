import Vorpal from 'vorpal';
import { SomConfig, SomState } from '../../lib/consts';
import chalk from 'chalk';
import * as cdkExec from '../../lib/aws/cdkExec';

export function actionSynthesize(vorpal: Vorpal, config: SomConfig, state: SomState) {
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
