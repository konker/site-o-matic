import { IamAccessKey } from '@cdktf/provider-aws/lib/iam-access-key';
import { IamUser } from '@cdktf/provider-aws/lib/iam-user';
import { SsmParameter } from '@cdktf/provider-aws/lib/ssm-parameter';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import { SSM_PARAM_NAME_DOMAIN_USER_USER_NAME } from '../../../../lib/consts';
import { resolveSsmSecretPath } from '../../../../lib/secrets';
import { _somTags, formulateIamUserName } from '../../../../lib/utils';
import type { SiteStack } from './SiteStack';

// ----------------------------------------------------------------------
export type DomainUserResources = {
  readonly domainUserName: string;
  readonly domainUser: IamUser;
  readonly domainUserAccessKey: IamAccessKey;
  readonly secrets: Array<SsmParameter>;
  readonly ssmParams: Array<SsmParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteStack: SiteStack): Promise<DomainUserResources> {
  const domainUserName = formulateIamUserName('user', siteStack.siteProps.context.somId);
  const domainUser = new IamUser(siteStack, 'BootstrapDomainUser', {
    name: domainUserName,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  // ----------------------------------------------------------------------
  const domainUserAccessKey = new IamAccessKey(siteStack, 'DomainUserAccessKey', {
    user: domainUser.id,
    provider: siteStack.providerManifestRegion,
  });

  // ----------------------------------------------------------------------
  // Secrets
  const secretPath = resolveSsmSecretPath(siteStack.siteProps.config, siteStack.siteProps.context.somId);
  const secret1 = new SsmParameter(siteStack, 'SecretDomainUserAccessKeyId', {
    type: 'SecureString',
    name: `${secretPath}/DOMAIN_USER_AWS_ACCESS_KEY_ID`,
    value: domainUserAccessKey.id,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });
  const secret2 = new SsmParameter(siteStack, 'SecretDomainUserAccessKeySecret', {
    type: 'SecureString',
    name: `${secretPath}/DOMAIN_USER_AWS_ACCESS_KEY_SECRET`,
    value: domainUserAccessKey.secret,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  // ----------------------------------------------------------------------
  // SSM Params
  const ssm1 = new SsmParameter(siteStack, 'SsmDomainUserName', {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_DOMAIN_USER_USER_NAME
    ),
    value: domainUserName,
    provider: siteStack.providerControlPlaneRegion,
    tags: _somTags(siteStack),
  });

  return {
    domainUserName,
    domainUser,
    domainUserAccessKey,
    secrets: [secret1, secret2],
    ssmParams: [ssm1],
  };
}
