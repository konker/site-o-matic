import Vorpal from 'vorpal';
import { AWS_REGION, SomConfig, SomState } from '../../lib/consts';
import * as secretsmanager from '../../lib/aws/secretsmanager';
import { tabulate } from '../../lib/ui/tables';

export function actionDeleteSecret(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.deleteSomSecret(config, AWS_REGION, args.name);
    state.spinner.stop();

    vorpal.log(tabulate(data, ['Name']));
  };
}
