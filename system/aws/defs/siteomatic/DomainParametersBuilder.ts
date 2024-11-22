import { SsmParameter } from '@cdktf/provider-aws/lib/ssm-parameter';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  SSM_PARAM_NAME_PROTECTED_STATUS,
  SSM_PARAM_NAME_ROOT_DOMAIN_NAME,
  SSM_PARAM_NAME_SOM_VERSION,
  SSM_PARAM_NAME_WEBMASTER_EMAIL,
  SSM_PARAM_PATH_ROOT_DOMAIN_NAME,
  UNKNOWN,
  VERSION,
} from '../../../../lib/consts';
import { _somTags, contextTemplateString } from '../../../../lib/utils';
import type { SiteStack } from './SiteStack';

// ----------------------------------------------------------------------
export type DomainParametersResources = Array<SsmParameter>;

// ----------------------------------------------------------------------
export async function build(siteStack: SiteStack): Promise<DomainParametersResources> {
  if (!siteStack.domainUserResources?.domainUserName) {
    throw new Error('[site-o-matic] Could not build parameter resources when domainUserName is missing');
  }

  const ssm1 = new SsmParameter(siteStack, 'SsmSiteEntryRootDomainName', {
    type: 'String',
    name: `${SSM_PARAM_PATH_ROOT_DOMAIN_NAME}/${siteStack.siteProps.context.rootDomainName}`,
    value: siteStack.siteProps.context.somId,
    provider: siteStack.providerControlPlaneRegion,
    tags: _somTags(siteStack),
  });

  const ssm2 = new SsmParameter(siteStack, 'SsmSiteEntrySomId', {
    type: 'String',
    name: `/som/site/som-id/${siteStack.siteProps.context.somId}`,
    value: siteStack.siteProps.context.rootDomainName,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  const ssm3 = new SsmParameter(siteStack, 'SsmRootDomain', {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_ROOT_DOMAIN_NAME
    ),
    value: siteStack.siteProps.context.rootDomainName,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  const ssm4 = new SsmParameter(siteStack, 'SsmWebmasterEmail', {
    type: 'String',
    name: toSsmParamName(siteStack.siteProps.config, siteStack.siteProps.context.somId, SSM_PARAM_NAME_WEBMASTER_EMAIL),
    value:
      contextTemplateString(
        siteStack.siteProps.context.manifest.webmasterEmail ?? siteStack.siteProps.config.WEBMASTER_EMAIL_DEFAULT,
        siteStack.siteProps.context
      ) ?? UNKNOWN,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  const ssm5 = new SsmParameter(siteStack, 'SsmSomVersion', {
    type: 'String',
    name: toSsmParamName(siteStack.siteProps.config, siteStack.siteProps.context.somId, SSM_PARAM_NAME_SOM_VERSION),
    value: VERSION,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  const ssm6 = new SsmParameter(siteStack, 'SsmProtectedStatus', {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_PROTECTED_STATUS
    ),
    value: siteStack.siteProps.protected ? 'true' : 'false',
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  return [ssm1, ssm2, ssm3, ssm4, ssm5, ssm6];
}
