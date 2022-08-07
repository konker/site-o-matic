import Vorpal from 'vorpal';
import { AWS_REGION, SomState } from '../../lib/consts';
import * as iam from '../../lib/aws/iam';
import { tabulate } from '../../lib/ui/tables';

export function actionDeletePublicKey(vorpal: Vorpal, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const keys = await iam.deletePublicKey(AWS_REGION, args.username, args.keyId);
    state.spinner.stop();

    vorpal.log(tabulate(keys, ['SSHPublicKeyId', 'Status']));
  };
}
