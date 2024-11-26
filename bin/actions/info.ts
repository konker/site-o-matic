import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { SOM_STATUS_BREADCRUMB, UNKNOWN, VERSION } from '../../lib/consts';
import { hasManifest, refreshContextPass1, refreshContextPass2 } from '../../lib/context';
import type { WafAwsManagedRule } from '../../lib/manifest/schemas/site-o-matic-manifest.schema';
import { siteOMaticRules } from '../../lib/rules/site-o-matic.rules';
import { getStatus, getStatusMessage } from '../../lib/status';
import type { SomInfoSpec, SomInfoStatus } from '../../lib/types';
import { renderInfoSpec, renderInfoStatus } from '../../lib/ui/info';
import { verror } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionInfo(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    if (!hasManifest(state.context)) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    try {
      state.spinner.start();

      const contextPass1 = await refreshContextPass1(config, state.context);
      const facts = await siteOMaticRules(contextPass1);
      const context = await refreshContextPass2(contextPass1, facts);
      const status = getStatus(facts);
      const statusMessage = getStatusMessage(context, facts, status);

      state.updateContext(context);
      state.spinner.stop();

      const infoSpec: SomInfoSpec = {
        siteUrl: context.siteUrl ?? UNKNOWN,
        webmasterEmail: context.webmasterEmail,
        registrar: context.registrar,
        region: context.manifest.region,
        extraDnsConfig: context.manifest.extraDnsConfig?.map((x) => ({
          Type: x.type,
          Properties: Object.values(x).slice(1).join(' '),
        })),
        webHosting: context.manifest.webHosting.map((x) =>
          Object.assign(
            { type: x.type },
            'domainName' in x ? { domainName: x.domainName } : {},
            'originPath' in x ? { originPath: x.originPath } : {},
            'content' in x ? { content: x.content?.producerId } : { content: undefined },
            'redirect' in x ? { redirect: x.redirect } : { redirect: undefined },
            'auth' in x ? { auth: x.auth } : { auth: undefined },
            'waf' in x
              ? {
                  waf: x?.waf
                    ? {
                        enabled: x.waf.enabled,
                        AWSManagedRules: x.waf.AWSManagedRules?.map((i: WafAwsManagedRule) => i.name) ?? [],
                      }
                    : undefined,
                }
              : { waf: undefined }
          )
        ),
        notifications: {
          disabled: context.manifest.notifications?.disabled ?? false,
          noSubscription: context.manifest.notifications?.noSubscription ?? false,
          subscriptionEmail: context.manifest.notifications?.subscriptionEmail ?? context.webmasterEmail,
        },
        protected: {
          protectedManifest: facts.protectedManifest,
          protectedSsm: facts.protectedSsm,
        },
        pathToManifestFile: { Param: 'pathToManifestFile', Value: context.pathToManifestFile ?? UNKNOWN },
        manifestHash: { Param: 'manifestHash', Value: context.manifestHash ?? UNKNOWN },
        somId: { Param: 'somId', Value: context.somId ?? UNKNOWN },
      };

      const infoStatus: SomInfoStatus = {
        somVersion: {
          somVersionSystem: VERSION,
          somVersionSite: context.somVersion,
        },
        status: {
          status,
          statusMessage,
          breadcrumb: SOM_STATUS_BREADCRUMB,
        },
        connectionStatus: context.connectionStatus
          ? {
              statusCode: context.connectionStatus.statusCode,
              statusMessage: context.connectionStatus.statusMessage,
              timing: context.connectionStatus.timing,
            }
          : undefined,
        hostedZoneVerified: facts.hostedZoneVerified,
        verificationTxtRecordViaDns: context.dnsVerificationTxtRecord,
        nameserversSet: facts.registrarNameserversMatchHostedZoneNameServers,
        registrarNameservers: context.registrarNameservers,
        params: context.params,
      };

      if (state.plumbing) {
        const out = {
          context,
          infoSpec,
          infoStatus,
        };
        vorpal.log(JSON.stringify(out));
      } else {
        vorpal.log(renderInfoSpec(infoSpec));
        vorpal.log('\n');
        vorpal.log(renderInfoStatus(infoSpec, infoStatus));
      }
    } catch (ex) {
      state.spinner.stop();
      verror(vorpal, state, ex);
    }
  };
}
