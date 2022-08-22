import Vorpal from 'vorpal';
import { AWS_REGION, SomConfig, SomState } from '../../lib/consts';
import * as iam from '../../lib/aws/iam';
import { tabulate } from '../../lib/ui/tables';

export function actionListUsers(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const users = await iam.listSomUsers(config, AWS_REGION);
    state.spinner.stop();

    vorpal.log(tabulate(users, ['UserName']));
  };
}
