import * as iam from 'aws-cdk-lib/aws-iam';

import { _somMeta } from '../../../../lib/utils';
import type { SiteResourcesNestedStack } from './SiteStack/SiteResourcesNestedStack';

// ----------------------------------------------------------------------
export type DomainUserResources = {
  readonly domainUser: iam.IUser;
  readonly domainPolicy: iam.Policy;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesNestedStack): Promise<DomainUserResources> {
  const domainUser = iam.User.fromUserName(siteResourcesStack, 'DomainUser', siteResourcesStack.siteProps.username);

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
    domainUser,
    domainPolicy,
  };
}
