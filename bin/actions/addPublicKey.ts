import Vorpal from 'vorpal';
import { AWS_REGION, SomConfig, SomState } from '../../lib/consts';
import fs from 'fs';
import * as iam from '../../lib/aws/iam';
import { tabulate } from '../../lib/ui/tables';

export function actionAddPublicKey(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const publicKey = await fs.promises.readFile(args.pathToPublicKeyFile);
    const keys = await iam.addPublicKey(config, AWS_REGION, args.username, publicKey.toString());
    state.spinner.stop();

    vorpal.log(tabulate(keys, ['SSHPublicKeyId', 'Status']));
  };
}
