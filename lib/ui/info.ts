import chalk from 'chalk';

import { UNKNOWN } from '../consts';
import { formatStatusBreadCrumbAndMessage } from '../status';
import type { SomInfoSpec, SomInfoStatus } from '../types';
import { tabulate } from './tables';

export function renderInfoSpec(infoSpec: SomInfoSpec): string {
  return tabulate(
    [
      { Param: chalk.bold(chalk.white('site')), Value: chalk.bold(chalk.blue(chalk.underline(infoSpec.siteUrl))) },
      {
        Param: chalk.bold(chalk.white('registrar')),
        Value: infoSpec.registrar,
      },
      {
        Param: chalk.bold(chalk.white('subdomains')),
        Value: infoSpec.subdomains?.join('\n'),
      },
      {
        Param: chalk.bold(chalk.white('certificate clones')),
        Value: infoSpec.certificateCloneNames?.join('\n'),
      },
      {
        Param: chalk.bold(chalk.white('web hosting')),
        Value: infoSpec.webHosting
          ? tabulate(
              [
                {
                  Hosting:
                    `${chalk.bold(chalk.white('type'))}:\n↪ ${infoSpec.webHosting.type}` +
                    `\n${chalk.bold(chalk.white('originPath'))}:\n↪ ${infoSpec.webHosting.originPath}` +
                    `\n${chalk.bold(chalk.white('defaultRootObject'))}:\n↪ ${infoSpec.webHosting.defaultRootObject}`,
                  ErrorResponses: infoSpec.webHosting.errorResponses.join('\n'),
                  WAF: infoSpec.webHosting?.waf
                    ? `${chalk.bold(chalk.white('WAF enabled'))}:\n↪ ${infoSpec.webHosting.waf.enabled}\n${chalk.bold(
                        chalk.white('WAF managed rules')
                      )}: ${infoSpec.webHosting.waf.AWSManagedRules?.map((rule: string) => `\n↪ ${rule}`)}\n`
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
        Value: infoSpec.pipeline
          ? `${chalk.bold(chalk.white('type'))}:\n↪ ${infoSpec.pipeline.type}` +
            ('codestarConnectionArn' in infoSpec.pipeline
              ? `\n${chalk.bold(chalk.white('codestarConnectionArn'))}:\n↪ ${infoSpec.pipeline.codestarConnectionArn}`
              : '') +
            ('owner' in infoSpec.pipeline
              ? `\n${chalk.bold(chalk.white('owner'))}:\n↪ ${infoSpec.pipeline.owner}`
              : '') +
            ('repo' in infoSpec.pipeline ? `\n${chalk.bold(chalk.white('repo'))}:\n↪ ${infoSpec.pipeline?.repo}` : '')
          : undefined,
      },
      {
        Param: chalk.bold(chalk.white('redirect')),
        Value: infoSpec.redirect
          ? `${chalk.bold(chalk.white('type'))}:\n↪ ${infoSpec.redirect.type}` +
            `\n${chalk.bold(chalk.white('action'))}:\n ${infoSpec.redirect.action}`
          : undefined,
      },
      {
        Param: chalk.bold(chalk.white('cross account access')),
        Value: infoSpec.crossAccountAccessNames?.join('\n'),
      },
      {
        Param: chalk.bold(chalk.white('protected')),
        Value: `SSM: ${
          infoSpec.protected.protectedSsm === infoSpec.protected.protectedManifest
            ? chalk.green(infoSpec.protected.protectedSsm)
            : chalk.red(infoSpec.protected.protectedSsm)
        } / Manifest: ${
          infoSpec.protected.protectedManifest === infoSpec.protected.protectedSsm
            ? chalk.green(infoSpec.protected.protectedManifest)
            : chalk.red(infoSpec.protected.protectedManifest)
        }`,
      },
    ],
    ['Param', 'Value'],
    ['', 'Manifest']
  );
}

export function renderInfoStatus(infoSpec: SomInfoSpec, infoStatus: SomInfoStatus): string {
  return tabulate(
    [
      {
        Param: chalk.bold(chalk.white('site-o-matic version')),
        Value:
          infoStatus.somVersion.somVersionSite === UNKNOWN ||
          infoStatus.somVersion.somVersionSite === infoStatus.somVersion.somVersionSystem
            ? infoStatus.somVersion.somVersionSite
            : `${chalk.red(
                infoStatus.somVersion.somVersionSite
              )}\nCurrently running site-o-matic version is not compatible with this deployment`,
      },
      {
        Param: chalk.bold(chalk.white('status')),
        Value: formatStatusBreadCrumbAndMessage(infoStatus.status.status, infoStatus.status.statusMessage),
      },
      {
        Param: chalk.bold(chalk.white('connection status')),
        Value:
          !!infoSpec.webHosting && !!infoStatus.connectionStatus
            ? `${infoStatus.connectionStatus.statusCode}: ${infoStatus.connectionStatus.statusMessage} in ${infoStatus.connectionStatus.timing}ms`
            : 'N/A',
      },
      {
        Param: 'verification TXT',
        Value: infoStatus.hostedZoneVerified
          ? chalk.green(infoStatus.verificationTxtRecordViaDns)
          : infoStatus.verificationTxtRecordViaDns,
      },
      {
        Param: chalk.bold(chalk.white('registrar nameservers')),
        Value: infoStatus.nameserversSet
          ? chalk.green(infoStatus.registrarNameservers?.join('\n'))
          : infoStatus.registrarNameservers?.join('\n'),
      },
      ...infoStatus.params,
      infoStatus.pathToManifestFile,
      infoStatus.somId,
    ],
    ['Param', 'Value'],
    ['', 'System Status']
  );
}
