import chalk from 'chalk';

import { UNKNOWN } from '../consts';
import type { AuthClause, RedirectClause, WafClause } from '../manifest/schemas/site-o-matic-manifest.schema';
import { formatStatusBreadCrumbAndMessage } from '../status';
import type { SomInfoSpec, SomInfoStatus } from '../types';
import { tabulate } from './tables';
import { ssmParamLabel } from './utils';

export function renderWebHostingWaf(waf: WafClause): string {
  return `${chalk.bold(chalk.white('WAF enabled'))}:\n ↪ ${waf.enabled}\n${chalk.bold(
    chalk.white('WAF managed rules')
  )}: ${waf.AWSManagedRules?.map((rule) => `\n ↪ ${rule.name}`).join('')}\n`;
}

export function renderWebHostingRedirect(redirect: RedirectClause): string {
  return (
    `${chalk.bold(chalk.white('source'))}:\n ↪ ${redirect.source}` +
    `\n${chalk.bold(chalk.white('target'))}:\n ${redirect.target}`
  );
}

export function renderWebHostingAuth(auth: AuthClause): string {
  return (
    `${chalk.bold(chalk.white('username secret'))}:\n ↪ ${auth.usernameSecretName}` +
    `\n${chalk.bold(chalk.white('password secret'))}:\n ${auth.passwordSecretName}`
  );
}

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
      {
        Param: chalk.bold(chalk.white('region')),
        Value: infoSpec.region,
      },
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
                    'redirect' in x && !!x.redirect
                      ? { Param: 'redirect', Value: renderWebHostingRedirect(x.redirect as RedirectClause) }
                      : { Param: 'redirect', Value: undefined },
                    'auth' in x && !!x.auth
                      ? { Param: 'auth', Value: renderWebHostingAuth(x.auth as AuthClause) }
                      : { Param: 'auth', Value: undefined },
                    'waf' in x && !!x.waf
                      ? {
                          Param: 'WAF',
                          Value: renderWebHostingWaf(x.waf as WafClause),
                        }
                      : { Param: 'WAF', Value: undefined },
                    'keyValueStore' in x && !!x.keyValueStore
                      ? {
                          Param: 'keyValueStore',
                          Value: x.keyValueStore,
                        }
                      : { Param: 'keyValueStore', Value: x },
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
      {
        Param: chalk.bold(chalk.white('extraDnsConfig')),
        Value: tabulate(infoSpec.extraDnsConfig ?? [], ['Type', 'Properties'], undefined, false, [25, 54]),
      },
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
    ].concat([
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
      infoSpec.pathToManifestFile,
      infoSpec.manifestHash,
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
