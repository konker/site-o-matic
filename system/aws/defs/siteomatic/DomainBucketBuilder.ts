import { CloudfrontOriginAccessControl } from '@cdktf/provider-aws/lib/cloudfront-origin-access-control';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { S3BucketPublicAccessBlock } from '@cdktf/provider-aws/lib/s3-bucket-public-access-block';
import { S3BucketServerSideEncryptionConfigurationA } from '@cdktf/provider-aws/lib/s3-bucket-server-side-encryption-configuration';
import { S3BucketVersioningA } from '@cdktf/provider-aws/lib/s3-bucket-versioning';
import { SsmParameter } from '@cdktf/provider-aws/lib/ssm-parameter';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import { SSM_PARAM_NAME_DOMAIN_BUCKET_NAME } from '../../../../lib/consts';
import { _somTags } from '../../../../lib/utils';
import type { SiteStack } from './SiteStack';

// ----------------------------------------------------------------------
export type DomainBucketResources = {
  readonly domainBucket: S3Bucket;
  readonly domainBucketVersioning: S3BucketVersioningA;
  readonly domainBucketServerSideEncryptionConfiguration: S3BucketServerSideEncryptionConfigurationA;
  readonly domainBucketPublicAccessBlock: S3BucketPublicAccessBlock;
  readonly originAccessControl: CloudfrontOriginAccessControl;
  readonly ssmParams: Array<SsmParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteStack: SiteStack): Promise<DomainBucketResources> {
  if (!siteStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build domain bucket resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  // Origin Access Control (OAC) which will govern the cloudfront distribution access to the S3 origin bucket
  const originAccessControl = new CloudfrontOriginAccessControl(siteStack, 'OriginAccessControl', {
    name: `oac-${siteStack.siteProps.context.somId}`,
    originAccessControlOriginType: 's3',
    signingBehavior: 'always',
    signingProtocol: 'sigv4',
    description: 'Origin access control provisioned by site-o-matic',
  });

  // ----------------------------------------------------------------------
  // Domain www content bucket and bucket policy
  const bucketName = `wwwbucket-${siteStack.siteProps.context.somId}`;
  const domainBucket = new S3Bucket(siteStack, 'DomainBucket', {
    bucket: bucketName,
    forceDestroy: siteStack.siteProps.context.manifest.protected,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  const domainBucketVersioning = new S3BucketVersioningA(siteStack, 'domainBucketVersioning', {
    bucket: domainBucket.id,
    versioningConfiguration: {
      status: 'Disabled',
    },
    provider: siteStack.providerManifestRegion,
  });

  const domainBucketServerSideEncryptionConfiguration = new S3BucketServerSideEncryptionConfigurationA(
    siteStack,
    'DomainBucketServerSideEncryptionConfiguration',
    {
      bucket: domainBucket.id,
      rule: [
        {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: 'AES256',
          },
        },
      ],
      provider: siteStack.providerManifestRegion,
    }
  );

  siteStack.domainUserPolicyDocuments.push(
    new DataAwsIamPolicyDocument(siteStack, 'DomainUserBucketPolicyDocument', {
      statement: [
        {
          effect: 'Allow',
          actions: ['s3:DeleteObject', 's3:GetObject', 's3:GetObjectVersion', 's3:PutObject', 's3:PutObjectAcl'],
          resources: [`${domainBucket.arn}/*`],
        },
        {
          effect: 'Allow',
          actions: ['s3:ListBucket'],
          resources: [domainBucket.arn],
        },
        {
          effect: 'Allow',
          actions: ['s3:DeleteObject', 's3:GetObject', 's3:GetObjectVersion', 's3:PutObject', 's3:PutObjectAcl'],
          resources: [`${domainBucket.arn}/*`],
        },
        {
          effect: 'Allow',
          actions: ['s3:ListBucket'],
          resources: [domainBucket.arn],
        },
      ],
    })
  );

  const domainBucketPublicAccessBlock = new S3BucketPublicAccessBlock(siteStack, 'DomainBucketPublicAccessBlock', {
    bucket: domainBucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
    provider: siteStack.providerManifestRegion,
  });

  // ----------------------------------------------------------------------
  // SSM Params
  const ssm1 = new SsmParameter(siteStack, 'SsmDomainBucketName', {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_DOMAIN_BUCKET_NAME
    ),
    value: domainBucket.bucket,
    provider: siteStack.providerControlPlaneRegion,
    tags: _somTags(siteStack),
  });

  return {
    domainBucket,
    domainBucketVersioning,
    domainBucketServerSideEncryptionConfiguration,
    domainBucketPublicAccessBlock,
    originAccessControl,
    ssmParams: [ssm1],
  };
}
