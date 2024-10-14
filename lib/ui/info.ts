import chalk from 'chalk';

import { UNKNOWN } from '../consts';
import { formatStatusBreadCrumbAndMessage } from '../status';
import type { SomInfoSpec, SomInfoStatus } from '../types';
import { tabulate } from './tables';
import { ssmParamLabel } from './utils';

export function renderInfoSpec(infoSpec: SomInfoSpec): string {
  return tabulate(
    [
      { Param: chalk.bold(chalk.white('site')), Value: chalk.bold(chalk.blue(chalk.underline(infoSpec.siteUrl))) },
      {
        Param: chalk.bold(chalk.white('webmasterEmail')),
        Value: infoSpec.webmasterEmail,
      },
      {
        Param: chalk.bold(chalk.white('registrar')),
        Value: infoSpec.registrar,
      },
      /*
      {
        Param: chalk.bold(chalk.white('content')),
        Value: infoSpec.content ?? CONTENT_PRODUCER_ID_DEFAULT,
      },
      */
      {
        Param: chalk.bold(chalk.white('web hosting')),
        Value: infoSpec.webHosting
          ? infoSpec.webHosting
              .map((x) =>
                tabulate(
                  [
                    // { Param: 'DomainName', Value: x.domainName },
                    { Param: 'type', Value: x.type },
                    { Param: 'originPath', Value: x.originPath },
                    'content' in x ? { Param: 'content', Value: x.content } : { Param: 'content', Value: undefined },
                    'redirect' in x
                      ? { Param: 'redirect', Value: x.redirect }
                      : { Param: 'redirect', Value: undefined },
                    'auth' in x ? { Param: 'auth', Value: x.auth } : { Param: 'auth', Value: undefined },
                    'waf' in x ? { Param: 'WAF', Value: x.waf } : { Param: 'WAF', Value: undefined },
                  ],
                  ['Param', 'Value'],
                  ['', x.domainName ?? ''],
                  true,
                  [25, 54]
                )
              )
              .join('\n')
          : undefined,
      },
      /*[XXX]
      {
        Param: chalk.bold(chalk.white('pipeline')),
        Value: infoSpec.pipeline
          ? `${chalk.bold(chalk.white('type'))}:\n ↪ ${infoSpec.pipeline.type}` +
            ('codestarConnectionArn' in infoSpec.pipeline
              ? `\n${chalk.bold(chalk.white('codestarConnectionArn'))}:\n ↪ ${infoSpec.pipeline.codestarConnectionArn}`
              : '') +
            ('owner' in infoSpec.pipeline
              ? `\n${chalk.bold(chalk.white('owner'))}:\n ↪ ${infoSpec.pipeline.owner}`
              : '') +
            ('repo' in infoSpec.pipeline ? `\n${chalk.bold(chalk.white('repo'))}:\n ↪ ${infoSpec.pipeline?.repo}` : '')
          : undefined,
      },
      */
      /*[XXX]
      {
        Param: chalk.bold(chalk.white('redirect')),
        Value: infoSpec.redirect
          ? `${chalk.bold(chalk.white('type'))}:\n ↪ ${infoSpec.redirect.type}` +
            `\n${chalk.bold(chalk.white('action'))}:\n ${infoSpec.redirect.action}`
          : undefined,
      },
      */
      {
        Param: chalk.bold(chalk.white('notifications')),
        Value: tabulate(
          [
            {
              Disabled: infoSpec.notifications.disabled ? 'true' : 'false',
              NoSNSSubscription: infoSpec.notifications.noSubscription ? 'true' : 'false',
              SubscriptionEmail: infoSpec.notifications.subscriptionEmail,
            },
          ],
          ['Disabled', 'NoSNSSubscription', 'SubscriptionEmail'],
          undefined,
          false,
          [25, 25, 28]
        ),
      },
    ]
      /*[XXX]
      .concat(
        infoSpec.certificateClones
          ? [
              {
                Param: chalk.bold(chalk.white('certificate clones')),
                Value: infoSpec.certificateClones?.join('\n'),
              },
            ]
          : []
      )
      .concat(
        infoSpec.crossAccountAccessNames
          ? [
              {
                Param: chalk.bold(chalk.white('cross account access')),
                Value: infoSpec.crossAccountAccessNames?.join('\n'),
              },
            ]
          : []
      )
      */
      .concat([
        {
          Param: chalk.bold(chalk.white('locked')),
          Value: `SSM: ${
            infoSpec.locked.lockedSsm === infoSpec.locked.lockedManifest
              ? chalk.green(infoSpec.locked.lockedSsm)
              : chalk.red(infoSpec.locked.lockedSsm)
          } / Manifest: ${
            infoSpec.locked.lockedManifest === infoSpec.locked.lockedSsm
              ? chalk.green(infoSpec.locked.lockedManifest)
              : chalk.red(infoSpec.locked.lockedManifest)
          }`,
        },
        infoSpec.pathToManifestFile,
        infoSpec.somId,
      ]),
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
      ...infoStatus.params.map(({ Param, Value }) => ({ Param: chalk.cyan(ssmParamLabel(Param, 28)), Value })),
    ],
    ['Param', 'Value'],
    ['', 'System Status']
  );
}
