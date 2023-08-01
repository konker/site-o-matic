import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as secretsmanager from '../../lib/aws/secretsmanager';
import { DEFAULT_AWS_REGION, SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS } from '../../lib/consts';
import { getRegistrarConnector } from '../../lib/registrar';
import type { SomGlobalState } from '../../lib/SomGlobalState';
import type { SomConfig } from '../../lib/types';
import { verror, vlog } from '../../lib/ui/logging';
import { getContextParam } from '../../lib/utils';

export function actionSetNameServersWithRegistrar(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args): Promise<void> => {
    if (!state.context.registrar) {
      const errorMessage = 'ERROR: no registrar specified in manifest';
      verror(vorpal, state, errorMessage);
      return;
    }

    const nameservers = getContextParam(state.context, SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS)?.split(',');
    if (!nameservers || nameservers.length === 0) {
      const errorMessage = 'ERROR: missing nameservers, is the hosted zone deployed?';
      verror(vorpal, state, errorMessage);
      return;
    }

    const response = state.yes
      ? { confirm: 'y' }
      : await vorpal.activeCommand.prompt({
          type: 'input',
          name: 'confirm',
          message: chalk.green(
            `Are you sure you want to set registrar nameservers to: ${chalk.bold(nameservers.join(','))}? [y/n] `
          ),
        });
    if (response.confirm === 'y') {
      state.spinner.start();
      try {
        const registrarConnector = getRegistrarConnector(state.context.registrar);
        const somSecrets = await secretsmanager.getSomSecrets(config, DEFAULT_AWS_REGION, registrarConnector.SECRETS);
        if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
          const errorMessage = `ERROR: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`;
          verror(vorpal, state, errorMessage);
          return;
        }

        const result = await registrarConnector.setNameServers(
          config,
          somSecrets,
          state.context.rootDomainName as string,
          nameservers
        );
        vlog(vorpal, state, `Set nameservers: ${result}`);
      } catch (ex: any) {
        verror(vorpal, state, ex);
      } finally {
        state.spinner.stop();
      }
    }
  };
}
