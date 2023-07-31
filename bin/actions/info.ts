import type { ErrorResponse } from 'aws-cdk-lib/aws-cloudfront';
import type Vorpal from 'vorpal';

import {
  SOM_STATUS_BREADCRUMB,
  UNKNOWN,
  VERSION,
  WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
  WEB_HOSTING_DEFAULT_ERROR_RESPONSES,
  WEB_HOSTING_DEFAULT_ORIGIN_PATH,
} from '../../lib/consts';
import { hasManifest, refreshContext } from '../../lib/context';
import { siteOMaticRules } from '../../lib/rules/site-o-matic.rules';
import type { SomGlobalState } from '../../lib/SomGlobalState';
import { getStatus, getStatusMessage } from '../../lib/status';
import type { SomConfig, SomInfoSpec, SomInfoStatus, WafAwsManagedRule } from '../../lib/types';
import { renderInfoSpec, renderInfoStatus } from '../../lib/ui/info';
import { verror } from '../../lib/ui/logging';

export function actionInfo(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args): Promise<void> => {
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
        registrar: context.registrar,
        subdomains: context.subdomains,
        certificateCloneNames: context.certificateCloneNames,
        webHosting: {
          type: context.manifest.webHosting?.type,
          originPath: context.manifest.webHosting?.originPath ?? WEB_HOSTING_DEFAULT_ORIGIN_PATH,
          defaultRootObject: context.manifest.webHosting?.defaultRootObject ?? WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
          errorResponses: (context.manifest.webHosting?.errorResponses ?? WEB_HOSTING_DEFAULT_ERROR_RESPONSES).map(
            (i: ErrorResponse) => `↪ ${i.httpStatus} -> ${i.responsePagePath}`
          ),
          waf: context.manifest.webHosting?.waf
            ? {
                enabled: context.manifest.webHosting.waf.enabled,
                AWSManagedRules:
                  context.manifest.webHosting.waf.AWSManagedRules?.map((i: WafAwsManagedRule) => i.name) ?? [],
              }
            : undefined,
        },
        pipeline: context.manifest.pipeline,
        redirect: context.manifest.redirect
          ? {
              type: context.manifest.redirect.type,
              action: `${context.manifest.redirect.source} ⟶ ${context.manifest.redirect.target}`,
            }
          : undefined,
        crossAccountAccessNames: context.crossAccountAccessNames,
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
        nameserversSet: facts.nameserversSetButNotPropagated,
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
