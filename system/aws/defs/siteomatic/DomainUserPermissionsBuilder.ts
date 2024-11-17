import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { IamUserPolicy } from '@cdktf/provider-aws/lib/iam-user-policy';

import type { SiteStack } from './SiteStack';

// ----------------------------------------------------------------------
export type DomainUserPermissionsResources = {
  readonly domainUserPolicyDocument: DataAwsIamPolicyDocument | undefined;
  readonly domainUserPolicy: IamUserPolicy | undefined;
};

// ----------------------------------------------------------------------
export async function build(siteStack: SiteStack): Promise<DomainUserPermissionsResources> {
  if (!siteStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build domain user permission resources when domainUser is missing');
  }

  const domainUserPolicyDocument =
    siteStack.domainUserPolicyDocuments.length > 0
      ? new DataAwsIamPolicyDocument(siteStack, 'DomainUserPolicyDocument', {
          sourcePolicyDocuments: [...siteStack.domainUserPolicyDocuments].map((x) => x.json),
          provider: siteStack.providerManifestRegion,
        })
      : undefined;

  const domainUserPolicy = domainUserPolicyDocument
    ? new IamUserPolicy(siteStack, 'DomainUserPolicy', {
        user: siteStack.domainUserResources.domainUser.id,
        policy: domainUserPolicyDocument?.json,
        provider: siteStack.providerManifestRegion,
      })
    : undefined;

  return {
    domainUserPolicyDocument,
    domainUserPolicy,
  };
}
