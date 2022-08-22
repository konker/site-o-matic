import Vorpal from 'vorpal';
import { AWS_REGION, SomConfig, SomState } from '../../lib/consts';
import * as iam from '../../lib/aws/iam';
import { tabulate } from '../../lib/ui/tables';

export function actionListPublicKeys(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const keys = await iam.listPublicKeys(config, AWS_REGION, args.username);
    state.spinner.stop();

    vorpal.log(tabulate(keys, ['SSHPublicKeyId', 'Status', 'Remote']));
  };
}
