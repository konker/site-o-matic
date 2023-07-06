import fs from 'fs';
import type Vorpal from 'vorpal';

import * as iam from '../../lib/aws/iam';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { vtabulate } from '../../lib/ui/logging';

export function actionAddPublicKey(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const publicKey = await fs.promises.readFile(args['pathToPublicKeyFile']);
    const data = await iam.addPublicKey(config, DEFAULT_AWS_REGION, args.username, publicKey.toString());
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['SSHPublicKeyId', 'Status']);
  };
}
