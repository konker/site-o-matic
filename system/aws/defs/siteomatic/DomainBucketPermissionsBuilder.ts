import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { S3BucketPolicy } from '@cdktf/provider-aws/lib/s3-bucket-policy';

import type { SiteStack } from './SiteStack';

// ----------------------------------------------------------------------
export type DomainBucketPermissionsResources = {
  readonly domainBucketPolicyDocument: DataAwsIamPolicyDocument | undefined;
  readonly domainBucketPolicy: S3BucketPolicy | undefined;
};

// ----------------------------------------------------------------------
export async function build(siteStack: SiteStack): Promise<DomainBucketPermissionsResources> {
  if (!siteStack.domainBucketResources?.domainBucket) {
    throw new Error('[site-o-matic] Could not build domain bucket permission resources when domainBucket is missing');
  }

  const domainBucketPolicyDocument =
    siteStack.domainBucketPolicyDocuments.length > 0
      ? new DataAwsIamPolicyDocument(siteStack, 'DomainBucketPolicyDocument', {
          sourcePolicyDocuments: [...siteStack.domainBucketPolicyDocuments].map((x) => x.json),
          provider: siteStack.providerManifestRegion,
        })
      : undefined;

  const domainBucketPolicy = domainBucketPolicyDocument
    ? new S3BucketPolicy(siteStack, 'DomainBucketPolicy', {
        bucket: siteStack.domainBucketResources.domainBucket.id,
        policy: domainBucketPolicyDocument?.json,
        provider: siteStack.providerManifestRegion,
      })
    : undefined;

  return {
    domainBucketPolicyDocument,
    domainBucketPolicy,
  };
}
