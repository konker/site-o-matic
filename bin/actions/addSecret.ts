import Vorpal from 'vorpal';
import { AWS_REGION, SomState } from '../../lib/consts';
import * as secretsmanager from '../../lib/aws/secretsmanager';
import { tabulate } from '../../lib/ui/tables';

export function actionAddSecret(vorpal: Vorpal, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.addSomSecret(AWS_REGION, args.name, args.value);
    state.spinner.stop();

    vorpal.log(tabulate(data, ['Name']));
  };
}
