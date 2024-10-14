import { CfnOutput } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnAccessKey } from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import { SSM_PARAM_NAME_DOMAIN_PUBLISHER_USER_NAME } from '../../../../lib/consts';
import { _somMeta } from '../../../../lib/utils';
import type { SiteResourcesNestedStack } from './SiteStack/SiteResourcesNestedStack';

// ----------------------------------------------------------------------
export type DomainPublisherResources = {
  readonly domainPublisherAccessKey: CfnAccessKey;
  readonly secretNameAccessKeyId: string;
  readonly secretNameAccessKeySecret: string;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesNestedStack): Promise<DomainPublisherResources> {
  const domainBucket = siteResourcesStack.domainBucketResources?.domainBucket;
  if (!domainBucket) {
    throw new Error('[site-o-matic] Could not build domain publisher resources when domainBucket is missing');
  }
  const domainTopic = siteResourcesStack.domainTopicResources?.domainTopic;
  if (!domainTopic) {
    throw new Error('[site-o-matic] Could not build domain publisher resources when domainTopic is missing');
  }

  // ----------------------------------------------------------------------
  // Create domainPublisher user
  const domainPublisher = new iam.User(siteResourcesStack, 'DomainPublisher', {
    userName: `publisher-${siteResourcesStack.somId}`,
    path: siteResourcesStack.siteProps.config.SOM_PREFIX,
  });

  // Add to domain policy permissions to write to domain bucket
  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ['s3:DeleteObject', 's3:GetObject', 's3:GetObjectVersion', 's3:PutObject', 's3:PutObjectAcl'],
      resources: [`${domainBucket.bucketArn}/*`],
      principals: [domainPublisher as iam.IUser],
    })
  );
  domainBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [domainBucket.bucketArn],
      principals: [domainPublisher as iam.IUser],
    })
  );

  // Add permissions to publish to domain SNS topic?
  domainTopic.grantPublish(domainPublisher);

  // Export [access_id, access_secret] for domainPublisher
  const domainPublisherAccessKey = new CfnAccessKey(siteResourcesStack, 'DomainPublisherAccessKey', {
    userName: domainPublisher.userName,
  });

  // ----------------------------------------------------------------------
  // Save [access_id, access_secret] to SecretsManager using key: `secretName`
  /*[XXX: does not work]
  const secretPath1 = resolveSsmSecretPath(siteStack.siteProps.config, siteStack.somId);
  const secretNameAccessKeyId = `${secretPath1}/published_access_key_id`;
  const secret1 = new ssm.StringParameter(siteStack, 'SsmSecretAccessKeyId', {
    parameterName: secretNameAccessKeyId,
    stringValue: domainPublisherAccessKey.attrId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteStack.siteProps.config, secret1, siteStack.somId, siteStack.siteProps.locked);

  const secretPath2 = resolveSsmSecretPath(siteStack.siteProps.config, siteStack.somId);
  const secretNameAccessKeySecret = `${secretPath2}/published_access_key_secret`;
  const secret2 = new ssm.StringParameter(siteStack, 'SsmSecretAccessKeySecret', {
    parameterName: secretNameAccessKeySecret,
    stringValue: domainPublisherAccessKey.attrSecretAccessKey,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteStack.siteProps.config, secret2, siteStack.somId, siteStack.siteProps.locked);
  */
  new CfnOutput(siteResourcesStack, 'OutputSecretAccessKeyId', { value: domainPublisherAccessKey.ref });
  new CfnOutput(siteResourcesStack, 'SsmSecretAccessKeySecret', {
    value: domainPublisherAccessKey.attrSecretAccessKey,
  });

  // ----------------------------------------------------------------------
  // SSM Params
  const res1 = new ssm.StringParameter(siteResourcesStack, 'SsmDomainPublisherUserName', {
    parameterName: toSsmParamName(siteResourcesStack.somId, SSM_PARAM_NAME_DOMAIN_PUBLISHER_USER_NAME),
    stringValue: siteResourcesStack.somId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, res1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  /*[XXX: no secrets]
  const res2 = new ssm.StringParameter(siteStack, 'SsmDomainPublisherSecretNameAccessKeyId', {
    parameterName: toSsmParamName(siteStack.somId, SSM_PARAM_NAME_DOMAIN_PUBLISHER_SECRET_NAME_ACCESS_KEY_ID),
    stringValue: secretNameAccessKeyId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteStack.siteProps.config, res2, siteStack.somId, siteStack.siteProps.locked);

  const res3 = new ssm.StringParameter(siteStack, 'SsmDomainPublisherSecretNameAccessKeySecret', {
    parameterName: toSsmParamName(siteStack.somId, SSM_PARAM_NAME_DOMAIN_PUBLISHER_SECRET_NAME_ACCESS_KEY_SECRET),
    stringValue: secretNameAccessKeySecret,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteStack.siteProps.config, res3, siteStack.somId, siteStack.siteProps.locked);
  */

  return {
    domainPublisherAccessKey,
    secretNameAccessKeyId: domainPublisherAccessKey.attrId,
    secretNameAccessKeySecret: domainPublisherAccessKey.attrSecretAccessKey,
    ssmParams: [res1],
  };
}
