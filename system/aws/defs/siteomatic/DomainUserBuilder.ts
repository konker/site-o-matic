import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type * as ssm from 'aws-cdk-lib/aws-ssm';

import { BOOTSTRAP_DOMAIN_USER_USER_NAME_OUTPUT_NAME } from '../../../../lib/consts';
import { _somMeta } from '../../../../lib/utils';
import type { SiteResourcesStack } from './SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type DomainUserResources = {
  readonly domainUserName: string;
  readonly domainUser: iam.IUser;
  readonly domainUserPolicy: iam.Policy;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesStack): Promise<DomainUserResources> {
  const importedDomainUserName = cdk.Fn.importValue(
    BOOTSTRAP_DOMAIN_USER_USER_NAME_OUTPUT_NAME(siteResourcesStack.somId)
  );

  const domainUser = iam.User.fromUserName(siteResourcesStack, 'DomainUser', importedDomainUserName);

  const domainUserPolicy = new iam.Policy(siteResourcesStack, 'DomainUserPolicy', {
    statements: [],
  });
  _somMeta(
    siteResourcesStack.siteProps.config,
    domainUserPolicy,
    siteResourcesStack.somId,
    siteResourcesStack.siteProps.locked
  );

  return {
    domainUserName: importedDomainUserName,
    domainUser,
    domainUserPolicy,
    ssmParams: [],
  };
}
