import Vorpal from 'vorpal';
import { AWS_REGION, SomConfig, SomState } from '../../lib/consts';
import { getRegistrarConnector } from '../../lib/registrar/index';
import * as secretsmanager from '../../lib/aws/secretsmanager';
import { getParam } from '../../lib/utils';

export function actionSetNameServersWithRegistrar(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!state.registrar) {
      vorpal.log('ERROR: no registrar specified in manifest');
      return;
    }
    state.spinner.start();
    const registrarConnector = getRegistrarConnector(state.registrar);
    const somSecrets = await secretsmanager.getSomSecrets(config, AWS_REGION, registrarConnector.SECRETS);
    if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
      vorpal.log(`ERROR: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`);
      return;
    }

    const nameservers = getParam(state, 'hosted-zone-name-servers')?.split(',');
    if (!nameservers || nameservers.length === 0) {
      vorpal.log('ERROR: missing nameservers, is the hosted zone deployed?');
      return;
    }

    const result = await registrarConnector.setNameServers(somSecrets, state.rootDomain as string, nameservers);
    state.spinner.stop();

    vorpal.log(`Set nameservers: ${result}`);
  };
}
