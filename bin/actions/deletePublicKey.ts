import type Vorpal from 'vorpal';

import * as iam from '../../lib/aws/iam';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomGlobalState } from '../../lib/SomGlobalState';
import type { SomConfig } from '../../lib/types';
import { vtabulate } from '../../lib/ui/logging';

export function actionDeletePublicKey(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await iam.deletePublicKey(config, DEFAULT_AWS_REGION, args.username, args.keyId);
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['SSHPublicKeyId', 'Status']);
  };
}
