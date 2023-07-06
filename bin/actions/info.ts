import type { ErrorResponse } from 'aws-cdk-lib/aws-cloudfront';
import type Vorpal from 'vorpal';

import * as secretsmanager from '../../lib/aws/secretsmanager';
import * as ssm from '../../lib/aws/ssm';
import {
  DEFAULT_AWS_REGION,
  SOM_STATUS_BREADCRUMB,
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
import { getSomTxtRecordViaDns } from '../../lib/status';
import type { SomConfig, SomInfoSpec, SomInfoStatus, SomState, WafAwsManagedRule } from '../../lib/types';
import { renderInfoSpec, renderInfoStatus } from '../../lib/ui/info';
import { verror } from '../../lib/ui/logging';
import { getParam } from '../../lib/utils';

export function actionInfo(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      const errorMessage = `ERROR: no manifest loaded`;
      verror(vorpal, state, errorMessage);
      return;
    }

    state.spinner.start();

    try {
      state.params = await ssm.getSsmParams(config, DEFAULT_AWS_REGION, state.somId);
      state.somVersion = getParam(state, SSM_PARAM_NAME_SOM_VERSION) ?? VERSION;
      state.connectionStatus = await getSiteConnectionStatus(state.rootDomainName, state.siteUrl);
      state.verificationTxtRecordViaDns = await getSomTxtRecordViaDns(state.rootDomainName);
      state.protectedSsm = getParam(state, SSM_PARAM_NAME_PROTECTED_STATUS) ?? 'false';

      if (state.registrar) {
        const registrarConnector = getRegistrarConnector(state.registrar);
        const somSecrets = await secretsmanager.getSomSecrets(config, DEFAULT_AWS_REGION, registrarConnector.SECRETS);
        if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
          vorpal.log(`WARNING: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`);
        } else {
          state.registrarNameservers = await registrarConnector.getNameServers(
            somSecrets,
            state.rootDomainName as string
          );
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

      const infoSpec: SomInfoSpec = {
        siteUrl: state.siteUrl ?? UNKNOWN,
        registrar: state.registrar,
        subdomains: state.subdomains,
        certificateCloneNames: state.certificateCloneNames,
        webHosting: {
          type: state.manifest.webHosting?.type,
          originPath: state.manifest.webHosting?.originPath ?? WEB_HOSTING_DEFAULT_ORIGIN_PATH,
          defaultRootObject: state.manifest.webHosting?.defaultRootObject ?? WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
          errorResponses: (state.manifest.webHosting?.errorResponses ?? WEB_HOSTING_DEFAULT_ERROR_RESPONSES).map(
            (i: ErrorResponse) => `↪ ${i.httpStatus} -> ${i.responsePagePath}`
          ),
          waf: state.manifest.webHosting?.waf
            ? {
                enabled: state.manifest.webHosting.waf.enabled,
                AWSManagedRules:
                  state.manifest.webHosting.waf.AWSManagedRules?.map((i: WafAwsManagedRule) => i.name) ?? [],
              }
            : undefined,
        },
        pipeline: state.manifest.pipeline,
        redirect: state.manifest.redirect
          ? {
              type: state.manifest.redirect.type,
              action: `${state.manifest.redirect.source} ⟶ ${state.manifest.redirect.target}`,
            }
          : undefined,
        crossAccountAccessNames: state.crossAccountAccessNames,
        protected: {
          protectedManifest: Boolean(state.protectedManifest) ?? false,
          protectedSsm: Boolean(state.protectedSsm) ?? false,
        },
      };

      const infoStatus: SomInfoStatus = {
        somVersion: {
          somVersionSystem: VERSION,
          somVersionSite: state.somVersion,
        },
        status: {
          status: state.status,
          statusMessage: state.statusMessage,
          breadcrumb: SOM_STATUS_BREADCRUMB,
        },
        connectionStatus: state.connectionStatus
          ? {
              statusCode: state.connectionStatus.statusCode,
              statusMessage: state.connectionStatus.statusMessage,
              timing: state.connectionStatus.timing,
            }
          : undefined,
        hostedZoneVerified: state.hostedZoneVerified ?? false,
        verificationTxtRecordViaDns: state.verificationTxtRecordViaDns,
        nameserversSet: state.nameserversSet ?? false,
        registrarNameservers: state.registrarNameservers,
        params: state.params,
        pathToManifestFile: { Param: 'pathToManifestFile', Value: state.pathToManifestFile ?? UNKNOWN },
        somId: { Param: 'somId', Value: state.somId ?? UNKNOWN },
      };

      if (state.plumbing) {
        const out = {
          state,
          infoSpec,
          infoStatus,
        };
        vorpal.log(JSON.stringify(out, undefined, 2));
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
