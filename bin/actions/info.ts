import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as secretsmanager from '../../lib/aws/secretsmanager';
import * as ssm from '../../lib/aws/ssm';
import type { SomConfig, SomState } from '../../lib/consts';
import { DEFAULT_AWS_REGION, SSM_PARAM_NAME_HOSTED_ZONE_ID, SSM_PARAM_NAME_PROTECTED_STATUS } from '../../lib/consts';
import { getSiteConnectionStatus } from '../../lib/http';
import { getRegistrarConnector } from '../../lib/registrar';
import * as status from '../../lib/status';
import { formatStatus, getSomTxtRecordViaDns } from '../../lib/status';
import { tabulate } from '../../lib/ui/tables';
import { getParam } from '../../lib/utils';

export function actionInfo(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    const STATE_INFO_KEYS: Array<keyof SomState> = ['pathToManifestFile', 'somId'];

    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    state.spinner.start();

    try {
      state.params = await ssm.getSsmParams(config, DEFAULT_AWS_REGION, state.somId);
      state.status = await status.getStatus(state);
      state.verificationTxtRecordViaDns = await getSomTxtRecordViaDns(state.rootDomain);
      state.protectedSsm = getParam(state, SSM_PARAM_NAME_PROTECTED_STATUS) ?? 'false';

      const connectionStatus = await getSiteConnectionStatus(state.siteUrl);
      if (state.registrar) {
        const registrarConnector = getRegistrarConnector(state.registrar);
        const somSecrets = await secretsmanager.getSomSecrets(config, DEFAULT_AWS_REGION, registrarConnector.SECRETS);
        if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
          vorpal.log(`WARNING: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`);
        } else {
          state.registrarNameservers = await registrarConnector.getNameServers(somSecrets, state.rootDomain as string);
        }
      }
      const nameserversSet = !!(
        state.registrarNameservers &&
        state.registrarNameservers.join(',') === getParam(state, 'hosted-zone-name-servers')
      );
      const hostedZoneVerified = !!(
        state.verificationTxtRecordViaDns &&
        state.verificationTxtRecordViaDns === getParam(state, SSM_PARAM_NAME_HOSTED_ZONE_ID)
      );

      state.spinner.stop();

      vorpal.log(
        tabulate(
          [
            { Param: chalk.bold(chalk.white('site')), Value: chalk.bold(chalk.blue(chalk.underline(state.siteUrl))) },
            {
              Param: chalk.bold(chalk.white('registrar')),
              Value: state.registrar,
            },
            {
              Param: chalk.bold(chalk.white('webHostingType')),
              Value: state.manifest.webHosting?.type,
            },
            {
              Param: chalk.bold(chalk.white('pipelineType')),
              Value: state.manifest.pipeline?.type,
            },
            {
              Param: chalk.bold(chalk.white('contentProducerId')),
              Value: state.manifest.content?.producerId,
            },
            {
              Param: chalk.bold(chalk.white('subdomains')),
              Value: state.subdomains?.join('\n'),
            },
            {
              Param: chalk.bold(chalk.white('certificate?')),
              Value: !!state.certificateCreate ? 'YES' : 'NO',
            },
            {
              Param: chalk.bold(chalk.white('certificate clones')),
              Value: state.certificateCreate
                ? state.certificateCloneNames?.join('\n')
                : chalk.grey(state.certificateCloneNames?.join('\n')),
            },
            {
              Param: chalk.bold(chalk.white('cross account access')),
              Value: state.crossAccountAccessNames?.join('\n'),
            },
            {
              Param: chalk.bold(chalk.white('protected')),
              Value: `SSM: ${state.protectedSsm || '-'} / Manifest: ${state.protectedManifest || '-'}`,
            },
          ],
          ['Param', 'Value'],
          ['', 'Manifest']
        )
      );
      vorpal.log(
        tabulate(
          [
            {
              Param: chalk.bold(chalk.white('status')),
              Value: formatStatus(state.status),
            },
            {
              Param: chalk.bold(chalk.white('connect')),
              Value: `${connectionStatus.statusCode}: ${connectionStatus.statusMessage} in ${connectionStatus.timing}ms`,
            },
            {
              Param: 'verification TXT',
              Value: hostedZoneVerified
                ? chalk.green(state.verificationTxtRecordViaDns)
                : state.verificationTxtRecordViaDns,
            },
            {
              Param: chalk.bold(chalk.white('registrar nameservers')),
              Value: nameserversSet ? chalk.green(state.registrarNameservers) : state.registrarNameservers,
            },
            ...state.params,
            ...STATE_INFO_KEYS.reduce((acc, param) => {
              return acc.concat({ Param: param, Value: state[param] });
            }, [] as any),
          ],
          ['Param', 'Value'],
          ['', 'System Status']
        )
      );
    } catch (ex) {
      state.spinner.stop();
      vorpal.log(`ERROR: ${ex}`);
    }
  };
}
