import type Vorpal from 'vorpal';

import * as cdkExec from '../../lib/aws/cdkExec';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { hasManifest } from '../../lib/context';
import { verror } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionStacks(vorpal: Vorpal, _: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    /*[XXX]
    const username = args.username ?? getContextParam(state.context, SSM_PARAM_NAME_DOMAIN_USER_NAME);
    if (!username) {
      const errorMessage = `ERROR: no username was resolved`;
      verror(vorpal, state, errorMessage);
      return;
    }
    */

    if (!hasManifest(state.context)) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    const [code, log] = await cdkExec.cdkList(
      vorpal,
      state.context.somId,
      {
        pathToManifestFile: state.context.pathToManifestFile,
      },
      state.plumbing
    );

    if (state.plumbing) {
      vorpal.log(JSON.stringify({ context: state.context, code, log }));
    }
  };
}
