import type Vorpal from 'vorpal';

import * as iam from '../../lib/aws/iam';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

/**
 @deprecated
 */
export function actionListPublicKeys(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    state.spinner.start();
    const data = await iam.listPublicKeys(
      config,
      state.context.manifest?.region ?? config.AWS_REGION_CONTROL_PLANE,
      args.username
    );
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['SSHPublicKeyId', 'Status', 'Remote']);
  };
}
