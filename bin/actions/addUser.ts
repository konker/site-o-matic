import Vorpal from 'vorpal';
import { AWS_REGION, SomConfig, SomState } from '../../lib/consts';
import * as iam from '../../lib/aws/iam';
import { tabulate } from '../../lib/ui/tables';

export function actionAddUser(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const users = await iam.addSomUser(config, AWS_REGION, args.username);
    state.spinner.stop();

    vorpal.log(tabulate(users, ['UserName']));
  };
}
