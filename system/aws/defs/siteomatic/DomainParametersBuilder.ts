import * as ssm from 'aws-cdk-lib/aws-ssm';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  SSM_PARAM_NAME_PROTECTED_STATUS,
  SSM_PARAM_NAME_ROOT_DOMAIN_NAME,
  SSM_PARAM_NAME_SOM_VERSION,
  SSM_PARAM_NAME_WEBMASTER_EMAIL,
  UNKNOWN,
  VERSION,
} from '../../../../lib/consts';
import { _somMeta, contextTemplateString } from '../../../../lib/utils';
import type { SiteResourcesStack } from './SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type DomainParametersResources = Array<ssm.StringParameter>;

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesStack): Promise<DomainParametersResources> {
  if (!siteResourcesStack.domainUserResources?.domainUserName) {
    throw new Error('[site-o-matic] Could not build parameter resources when domainUserName is missing');
  }
  if (!siteResourcesStack.domainPublisherResources?.domainPublisherUserName) {
    throw new Error('[site-o-matic] Could not build parameter resources when domainPublisherUserName is missing');
  }

  const res1 = new ssm.StringParameter(siteResourcesStack, 'SsmSiteEntryRootDomainName', {
    parameterName: `/som/site/root-domain-name/${siteResourcesStack.siteProps.context.rootDomainName}`,
    stringValue: siteResourcesStack.somId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, res1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const res2 = new ssm.StringParameter(siteResourcesStack, 'SsmSiteEntrySomId', {
    parameterName: `/som/site/som-id/${siteResourcesStack.somId}`,
    stringValue: siteResourcesStack.siteProps.context.rootDomainName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, res2, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const res3 = new ssm.StringParameter(siteResourcesStack, 'SsmRootDomain', {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.somId,
      SSM_PARAM_NAME_ROOT_DOMAIN_NAME
    ),
    stringValue: siteResourcesStack.siteProps.context.rootDomainName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, res3, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const res4 = new ssm.StringParameter(siteResourcesStack, 'SsmWebmasterEmail', {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.somId,
      SSM_PARAM_NAME_WEBMASTER_EMAIL
    ),
    stringValue:
      contextTemplateString(
        siteResourcesStack.siteProps.context.manifest.webmasterEmail ??
          siteResourcesStack.siteProps.config.DEFAULT_WEBMASTER_EMAIL,
        siteResourcesStack.siteProps.context
      ) ?? UNKNOWN,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, res4, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const res5 = new ssm.StringParameter(siteResourcesStack, 'SsmProtectedStatus', {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.somId,
      SSM_PARAM_NAME_PROTECTED_STATUS
    ),
    stringValue: siteResourcesStack.siteProps.locked ? 'true' : 'false',
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, res5, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const res6 = new ssm.StringParameter(siteResourcesStack, 'SsmSomVersion', {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.somId,
      SSM_PARAM_NAME_SOM_VERSION
    ),
    stringValue: VERSION,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, res6, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  return [res1, res2, res3, res4, res5, res6];
}
