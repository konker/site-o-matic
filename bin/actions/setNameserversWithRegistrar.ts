import chalk from 'chalk';
import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS } from '../../lib/consts';
import { hasManifest, refreshContextPass1, refreshContextPass2 } from '../../lib/context';
import { getRegistrarConnector } from '../../lib/registrar';
import { siteOMaticRules } from '../../lib/rules/site-o-matic.rules';
import * as secrets from '../../lib/secrets';
import { verror, vlog } from '../../lib/ui/logging';
import { getContextParam } from '../../lib/utils';
import type { SomGlobalState } from '../SomGlobalState';

export function actionSetNameServersWithRegistrar(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    if (!hasManifest(state.context)) {
      const errorMessage = 'ERROR: no manifest loaded';
      verror(vorpal, state, errorMessage);
      return;
    }

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
            `Are you sure you want to set registrar nameservers to: ${chalk.bold(nameservers.join(','))}? [y/N] `
          ),
        });
    if (response.confirm === 'y') {
      state.spinner.start();
      try {
        const registrarConnector = getRegistrarConnector(state.context.registrar);
        const somSecrets = await secrets.getAllSomSecrets(config, state.context.manifest.region, state.context.somId);
        if (!registrarConnector.SECRETS.every((secretName) => somSecrets.lookup[secretName])) {
          const errorMessage = `ERROR: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`;
          verror(vorpal, state, errorMessage);
          return;
        }

        const result = await registrarConnector.setNameServers(
          config,
          state.context.manifest,
          somSecrets,
          state.context.rootDomainName as string,
          nameservers
        );
        vlog(vorpal, state, `Set nameservers: ${result}`);

        const contextPass1 = await refreshContextPass1(config, state.context);
        const facts = await siteOMaticRules(contextPass1);
        const context = await refreshContextPass2(contextPass1, facts);
        state.updateContext(context);
      } catch (ex: any) {
        verror(vorpal, state, ex);
      } finally {
        state.spinner.stop();
      }
    }
  };
}
