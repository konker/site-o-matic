import fs from 'fs';
import type Vorpal from 'vorpal';

import * as iam from '../../lib/aws/iam';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { tabulate } from '../../lib/ui/tables';

export function actionAddPublicKey(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const publicKey = await fs.promises.readFile(args['pathToPublicKeyFile']);
    const keys = await iam.addPublicKey(config, DEFAULT_AWS_REGION, args.username, publicKey.toString());
    state.spinner.stop();

    vorpal.log(tabulate(keys, ['SSHPublicKeyId', 'Status']));
  };
}
