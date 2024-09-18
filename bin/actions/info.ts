import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import {
  SOM_STATUS_BREADCRUMB,
  UNKNOWN,
  VERSION,
  WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
  WEB_HOSTING_DEFAULT_ERROR_RESPONSES,
  WEB_HOSTING_DEFAULT_ORIGIN_PATH,
  WEB_HOSTING_TYPE_CLOUDFRONT_S3,
} from '../../lib/consts';
import { hasManifest, refreshContext } from '../../lib/context';
import type {
  WafAwsManagedRule,
  WebHostingErrorResponse,
} from '../../lib/manifest/schemas/site-o-matic-manifest.schema';
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

      const context = await refreshContext(config, state.context);
      const facts = await siteOMaticRules(context);
      const status = getStatus(facts);
      const statusMessage = getStatusMessage(context, facts, status);

      state.updateContext(context);
      state.spinner.stop();

      const infoSpec: SomInfoSpec = {
        siteUrl: context.siteUrl ?? UNKNOWN,
        webmasterEmail: context.webmasterEmail,
        registrar: context.registrar,
        subdomains: context.subdomains,
        webHosting: {
          type: context.manifest.webHosting?.type ?? WEB_HOSTING_TYPE_CLOUDFRONT_S3,
          originPath: context.manifest.webHosting?.originPath ?? WEB_HOSTING_DEFAULT_ORIGIN_PATH,
          defaultRootObject: context.manifest.webHosting?.defaultRootObject ?? WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
          errorResponses: (context.manifest.webHosting?.errorResponses ?? WEB_HOSTING_DEFAULT_ERROR_RESPONSES).map(
            (i: WebHostingErrorResponse) => `↪ ${i.httpStatus} -> ${i.responsePagePath}`
          ),
          waf: context.manifest.webHosting?.waf
            ? {
                enabled: context.manifest.webHosting.waf.enabled,
                AWSManagedRules:
                  context.manifest.webHosting.waf.AWSManagedRules?.map((i: WafAwsManagedRule) => i.name) ?? [],
              }
            : undefined,
        },
        content: context.manifest.content?.producerId,
        pipeline: context.manifest.pipeline,
        redirect: context.manifest.redirect
          ? {
              type: context.manifest.redirect.type,
              action: `${context.manifest.redirect.source} ⟶ ${context.manifest.redirect.target}`,
            }
          : undefined,
        services: context.manifest.services?.map((i) => [i.domainName, i.url]) ?? [],
        certificateClones: context.manifest.certificate?.clones?.map((i) => `${i.name} / ${i.region}`),
        crossAccountAccessNames: context.manifest.crossAccountAccess?.map((i) => i.name),

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
