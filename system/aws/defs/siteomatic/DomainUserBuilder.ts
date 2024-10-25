import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type * as ssm from 'aws-cdk-lib/aws-ssm';

import { CF_OUTPUT_NAME_DOMAIN_USER_USER_NAME } from '../../../../lib/consts';
import { _somMeta } from '../../../../lib/utils';
import type { SiteResourcesStack } from './SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type DomainUserResources = {
  readonly domainUserName: string;
  readonly domainUser: iam.IUser;
  readonly domainPolicy: iam.Policy;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesStack): Promise<DomainUserResources> {
  const importedDomainUserName = cdk.Fn.importValue(CF_OUTPUT_NAME_DOMAIN_USER_USER_NAME);

  const domainUser = iam.User.fromUserName(siteResourcesStack, 'DomainUser', importedDomainUserName);

  const domainPolicy = new iam.Policy(siteResourcesStack, 'DomainPolicy', {
    statements: [],
  });
  _somMeta(
    siteResourcesStack.siteProps.config,
    domainPolicy,
    siteResourcesStack.somId,
    siteResourcesStack.siteProps.locked
  );

  return {
    domainUserName: importedDomainUserName,
    domainUser,
    domainPolicy,
    ssmParams: [],
  };
}
