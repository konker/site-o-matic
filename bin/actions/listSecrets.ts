import Vorpal from 'vorpal';
import { AWS_REGION, SomConfig, SomState } from '../../lib/consts';
import * as secretsmanager from '../../lib/aws/secretsmanager';
import { tabulate } from '../../lib/ui/tables';

export function actionListSecrets(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.listSomSecrets(config, AWS_REGION);
    state.spinner.stop();

    vorpal.log(tabulate(data, ['Name']));
  };
}
