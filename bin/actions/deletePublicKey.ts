import type Vorpal from 'vorpal';

import * as iam from '../../lib/aws/iam';
import type { SomConfig, SomState } from '../../lib/consts';
import { AWS_REGION } from '../../lib/consts';
import { tabulate } from '../../lib/ui/tables';

export function actionDeletePublicKey(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const keys = await iam.deletePublicKey(config, AWS_REGION, args.username, args.keyId);
    state.spinner.stop();

    vorpal.log(tabulate(keys, ['SSHPublicKeyId', 'Status']));
  };
}
