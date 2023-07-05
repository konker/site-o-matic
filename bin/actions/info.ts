import type { ErrorResponse } from 'aws-cdk-lib/aws-cloudfront';
import chalk from 'chalk';
import type Vorpal from 'vorpal';

import * as secretsmanager from '../../lib/aws/secretsmanager';
import * as ssm from '../../lib/aws/ssm';
import {
  DEFAULT_AWS_REGION,
  SSM_PARAM_NAME_HOSTED_ZONE_ID,
  SSM_PARAM_NAME_PROTECTED_STATUS,
  SSM_PARAM_NAME_SOM_VERSION,
  UNKNOWN,
  VERSION,
  WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
  WEB_HOSTING_DEFAULT_ERROR_RESPONSES,
  WEB_HOSTING_DEFAULT_ORIGIN_PATH,
} from '../../lib/consts';
import { getSiteConnectionStatus } from '../../lib/http';
import { getRegistrarConnector } from '../../lib/registrar';
import * as status from '../../lib/status';
import { formatStatusBreadCrumbAndMessage, getSomTxtRecordViaDns } from '../../lib/status';
import type { SomConfig, SomState, WafAwsManagedRule } from '../../lib/types';
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
      state.somVersion = getParam(state, SSM_PARAM_NAME_SOM_VERSION) ?? VERSION;
      state.connectionStatus = await getSiteConnectionStatus(state.rootDomain, state.siteUrl);
      state.verificationTxtRecordViaDns = await getSomTxtRecordViaDns(state.rootDomain);
      state.protectedSsm = getParam(state, SSM_PARAM_NAME_PROTECTED_STATUS) ?? 'false';

      if (state.registrar) {
        const registrarConnector = getRegistrarConnector(state.registrar);
        const somSecrets = await secretsmanager.getSomSecrets(config, DEFAULT_AWS_REGION, registrarConnector.SECRETS);
        if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
          vorpal.log(`WARNING: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`);
        } else {
          state.registrarNameservers = await registrarConnector.getNameServers(somSecrets, state.rootDomain as string);
        }

        state.nameserversSet = !!(
          state.registrarNameservers &&
          state.registrarNameservers.join(',') === getParam(state, 'hosted-zone-name-servers')
        );
        state.hostedZoneVerified = !!(
          state.verificationTxtRecordViaDns &&
          state.verificationTxtRecordViaDns === getParam(state, SSM_PARAM_NAME_HOSTED_ZONE_ID)
        );
      }
      state.status = status.getStatus(state);
      state.statusMessage = status.getStatusMessage(state, state.status);

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
              Param: chalk.bold(chalk.white('subdomains')),
              Value: state.subdomains?.join('\n'),
            },
            {
              Param: chalk.bold(chalk.white('certificate clones')),
              Value: state.certificateCloneNames?.join('\n'),
            },
            {
              Param: chalk.bold(chalk.white('web hosting')),
              Value: state.manifest.webHosting
                ? tabulate(
                    [
                      {
                        Hosting:
                          `${chalk.bold(chalk.white('type'))}:\n↪ ${state.manifest.webHosting?.type}` +
                          `\n${chalk.bold(chalk.white('originPath'))}:\n↪ ${
                            state.manifest.webHosting?.originPath ?? WEB_HOSTING_DEFAULT_ORIGIN_PATH
                          }` +
                          `\n${chalk.bold(chalk.white('defaultRootObject'))}:\n↪ ${
                            state.manifest.webHosting?.originPath ?? WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT
                          }`,
                        ErrorResponses: (
                          state.manifest.webHosting?.errorResponses ?? WEB_HOSTING_DEFAULT_ERROR_RESPONSES
                        )
                          .map((i: ErrorResponse) => `↪ ${i.httpStatus} -> ${i.responsePagePath}`)
                          .join('\n'),
                        WAF: state.manifest.webHosting?.waf
                          ? `${chalk.bold(chalk.white('WAF enabled'))}:\n↪ ${
                              state.manifest.webHosting.waf?.enabled
                            }\n${chalk.bold(
                              chalk.white('WAF managed rules')
                            )}: ${state.manifest.webHosting.waf?.AWSManagedRules?.map(
                              (i: WafAwsManagedRule) => `\n↪ ${i.name}`
                            )}\n`
                          : undefined,
                      },
                    ],
                    ['Hosting', 'ErrorResponses', 'WAF'],
                    undefined,
                    false,
                    [25, 25, 28]
                  )
                : undefined,
            },
            {
              Param: chalk.bold(chalk.white('pipeline')),
              Value: state.manifest.pipeline
                ? `${chalk.bold(chalk.white('type'))}:\n↪ ${state.manifest.pipeline?.type}` +
                  ('codestarConnectionArn' in state.manifest.pipeline
                    ? `\n${chalk.bold(chalk.white('codestarConnectionArn'))}:\n↪ ${
                        state.manifest.pipeline?.codestarConnectionArn
                      }`
                    : '') +
                  ('owner' in state.manifest.pipeline
                    ? `\n${chalk.bold(chalk.white('owner'))}:\n↪ ${state.manifest.pipeline?.owner}`
                    : '') +
                  ('repo' in state.manifest.pipeline
                    ? `\n${chalk.bold(chalk.white('repo'))}:\n↪ ${state.manifest.pipeline?.repo}`
                    : '')
                : undefined,
            },
            /*[XXX: remove content producers?]
            {
              Param: chalk.bold(chalk.white('content producer ID')),
              Value: state.manifest.content?.producerId
                ? SITE_PIPELINE_TYPES_CODECOMMIT.includes(state.manifest.pipeline?.type)
                  ? state.manifest.content?.producerId
                  : `${state.manifest.content?.producerId}\n${chalk.yellow(
                      'WARNING: content is not automatically\nproduced for non-CodeCommit pipelines'
                    )}`
                : undefined,
            },
            */
            {
              Param: chalk.bold(chalk.white('cross account access')),
              Value: state.crossAccountAccessNames?.join('\n'),
            },
            {
              Param: chalk.bold(chalk.white('protected')),
              Value: `SSM: ${
                state.protectedSsm === state.protectedManifest
                  ? chalk.green(state.protectedSsm)
                  : chalk.red(state.protectedSsm)
              } / Manifest: ${
                state.protectedManifest === state.protectedSsm
                  ? chalk.green(state.protectedManifest)
                  : chalk.red(state.protectedManifest)
              }`,
            },
          ],
          ['Param', 'Value'],
          ['', 'Manifest']
        )
      );
      vorpal.log('\n');
      vorpal.log(
        tabulate(
          [
            {
              Param: chalk.bold(chalk.white('site-o-matic version')),
              Value:
                state.somVersion === UNKNOWN || state.somVersion === VERSION
                  ? state.somVersion
                  : `${chalk.red(
                      state.somVersion
                    )}\nCurrently running site-o-matic version is not compatible with this deployment`,
            },
            {
              Param: chalk.bold(chalk.white('status')),
              Value: formatStatusBreadCrumbAndMessage(state.status, state.statusMessage),
            },
            {
              Param: chalk.bold(chalk.white('connect')),
              Value: !!state.manifest.webHosting
                ? `${state.connectionStatus?.statusCode}: ${state.connectionStatus?.statusMessage} in ${state.connectionStatus?.timing}ms`
                : 'N/A',
            },
            {
              Param: 'verification TXT',
              Value: state.hostedZoneVerified
                ? chalk.green(state.verificationTxtRecordViaDns)
                : state.verificationTxtRecordViaDns,
            },
            {
              Param: chalk.bold(chalk.white('registrar nameservers')),
              Value: state.nameserversSet
                ? chalk.green(state.registrarNameservers)
                : state.registrarNameservers?.join('\n'),
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
