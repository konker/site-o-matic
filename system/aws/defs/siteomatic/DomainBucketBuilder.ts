import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import { SSM_PARAM_NAME_DOMAIN_BUCKET_NAME } from '../../../../lib/consts';
import { _removalPolicyFromBoolean, _somMeta } from '../../../../lib/utils';
import type { SiteResourcesStack } from './SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type DomainBucketResources = {
  readonly domainBucket: s3.Bucket;
  readonly originAccessControl: cloudfront.CfnOriginAccessControl;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesStack): Promise<DomainBucketResources> {
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build domain bucket resources when domainUser is missing');
  }
  if (!siteResourcesStack.domainPublisherResources?.domainPublisher) {
    throw new Error('[site-o-matic] Could not build domain bucket resources when domainPublisher is missing');
  }

  // ----------------------------------------------------------------------
  // Origin Access Control (OAC) which will govern the cloudfront distribution access to the S3 origin bucket
  const originAccessControl = new cloudfront.CfnOriginAccessControl(siteResourcesStack, 'OriginAccessControl', {
    originAccessControlConfig: {
      name: `oac-${siteResourcesStack.somId}`,
      originAccessControlOriginType: 's3',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
      description: 'Origin access control provisioned by site-o-matic',
    },
  });

  // ----------------------------------------------------------------------
  // Domain www content bucket and bucket policy
  const bucketName = `wwwbucket-${siteResourcesStack.somId}`;
  const domainBucket = new s3.Bucket(siteResourcesStack, 'DomainBucket', {
    bucketName,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    publicReadAccess: false,
    encryption: s3.BucketEncryption.S3_MANAGED,
    versioned: false,
    removalPolicy: _removalPolicyFromBoolean(siteResourcesStack.siteProps.locked),
    autoDeleteObjects: !siteResourcesStack.siteProps.locked,
  });
  _somMeta(
    siteResourcesStack.siteProps.config,
    domainBucket,
    siteResourcesStack.somId,
    siteResourcesStack.siteProps.locked
  );

  // Add to domain policy permissions for domainUser
  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ['s3:DeleteObject', 's3:GetObject', 's3:GetObjectVersion', 's3:PutObject', 's3:PutObjectAcl'],
      resources: [`${domainBucket.bucketArn}/*`],
      principals: [siteResourcesStack.domainUserResources.domainUser],
    })
  );
  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [domainBucket.bucketArn],
      principals: [siteResourcesStack.domainUserResources.domainUser],
    })
  );

  // Add to domain policy permissions for domainPublisher to write to domain bucket
  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ['s3:DeleteObject', 's3:GetObject', 's3:GetObjectVersion', 's3:PutObject', 's3:PutObjectAcl'],
      resources: [`${domainBucket.bucketArn}/*`],
      principals: [siteResourcesStack.domainPublisherResources.domainPublisher],
    })
  );
  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [domainBucket.bucketArn],
      principals: [siteResourcesStack.domainPublisherResources.domainPublisher],
    })
  );

  // ----------------------------------------------------------------------
  // SSM Params
  const ssm1 = new ssm.StringParameter(siteResourcesStack, 'SsmDomainBucketName', {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.somId,
      SSM_PARAM_NAME_DOMAIN_BUCKET_NAME
    ),
    stringValue: domainBucket.bucketName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, ssm1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  return {
    domainBucket,
    originAccessControl,
    ssmParams: [ssm1],
  };
}
