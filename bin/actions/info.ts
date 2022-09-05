import Vorpal from 'vorpal';
import { AWS_REGION, SomConfig, SomState } from '../../lib/consts';
import * as ssm from '../../lib/aws/ssm';
import * as status from '../../lib/status';
import { formatStatus, getSomTxtRecord } from '../../lib/status';
import { getSiteConnectionStatus } from '../../lib/http';
import { getRegistrarConnector } from '../../lib/registrar/index';
import * as secretsmanager from '../../lib/aws/secretsmanager';
import { tabulate } from '../../lib/ui/tables';
import chalk from 'chalk';

export function actionInfo(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    const STATE_INFO_KEYS: Array<keyof SomState> = ['pathToManifestFile', 'somId'];

    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    state.spinner.start();

    try {
      state.params = await ssm.getSsmParams(config, AWS_REGION, state.somId);
      state.status = await status.getStatus(state);
      state.verificationTxtRecord = await getSomTxtRecord(state.rootDomain);
      const connectionStatus = await getSiteConnectionStatus(state.siteUrl);
      if (state.registrar) {
        const registrarConnector = getRegistrarConnector(state.registrar);
        const somSecrets = await secretsmanager.getSomSecrets(config, AWS_REGION, registrarConnector.SECRETS);
        if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
          vorpal.log(`WARNING: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`);
        } else {
          state.registrarNameservers = await registrarConnector.getNameServers(somSecrets, state.rootDomain as string);
        }
      }

      state.spinner.stop();

      /*[TODO]
        - subdomains
        - certificate clones
        - cross account access
       */
      vorpal.log(
        tabulate(
          [
            { Param: chalk.bold('status'), Value: formatStatus(state.status) },
            { Param: chalk.bold('site'), Value: state.siteUrl },
            {
              Param: chalk.bold('connect'),
              Value: `${connectionStatus.statusCode}: ${connectionStatus.statusMessage} in ${connectionStatus.timing}ms`,
            },
            {
              Param: chalk.bold('pipelineType'),
              Value: state.manifest.pipelineType,
            },
            {
              Param: chalk.bold('registrar'),
              Value: state.registrar || '-',
            },
            {
              Param: chalk.bold('registrar nameservers'),
              Value: state.registrarNameservers || '-',
            },
            {
              Param: chalk.bold('subdomains'),
              Value: state.subdomains?.join('\n') || '-',
            },
            {
              Param: 'verification TXT',
              Value: state.verificationTxtRecord,
            },
            ...state.params,
            ...STATE_INFO_KEYS.reduce((acc, param) => {
              return acc.concat({ Param: param, Value: state[param] });
            }, [] as any),
          ],
          ['Param', 'Value']
        )
      );
    } catch (ex) {
      state.spinner.stop();
      vorpal.log(`ERROR: ${ex}`);
    }
  };
}
