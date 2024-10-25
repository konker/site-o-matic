import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { getCloudformationExport } from '../../../../lib/aws/cloudformation';
import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  CF_OUTPUT_NAME_DOMAIN_PUBLISHER_ACCESS_KEY_ID,
  CF_OUTPUT_NAME_DOMAIN_PUBLISHER_ACCESS_KEY_SECRET,
  CF_OUTPUT_NAME_DOMAIN_PUBLISHER_USER_NAME,
  DEFAULT_AWS_REGION,
  SSM_PARAM_NAME_DOMAIN_PUBLISHER_SECRET_NAME_ACCESS_KEY_ID,
  SSM_PARAM_NAME_DOMAIN_PUBLISHER_SECRET_NAME_ACCESS_KEY_SECRET,
} from '../../../../lib/consts';
import * as secrets from '../../../../lib/secrets';
import { SECRETS_SOURCE_SECRETS_MANAGER } from '../../../../lib/secrets/types';
import { _somMeta } from '../../../../lib/utils';
import type { SiteResourcesStack } from './SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type DomainPublisherResources = {
  readonly domainPublisherUserName: string;
  readonly domainPublisher: iam.IUser;
  readonly domainPublisherAccessKeyIdSecretName: string;
  readonly domainPublisherAccessKeySecretSecretName: string;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesStack): Promise<DomainPublisherResources> {
  const importedDomainPublisherUserName = cdk.Fn.importValue(CF_OUTPUT_NAME_DOMAIN_PUBLISHER_USER_NAME);
  const domainPublisher = iam.User.fromUserName(siteResourcesStack, 'DomainPublisher', importedDomainPublisherUserName);

  const importedDomainPublisherAccessKeyId = await getCloudformationExport(
    siteResourcesStack.siteProps.config,
    DEFAULT_AWS_REGION,
    CF_OUTPUT_NAME_DOMAIN_PUBLISHER_ACCESS_KEY_ID
  );
  const importedDomainPublisherAccessKeySecret = await getCloudformationExport(
    siteResourcesStack.siteProps.config,
    DEFAULT_AWS_REGION,
    CF_OUTPUT_NAME_DOMAIN_PUBLISHER_ACCESS_KEY_SECRET
  );

  if (!importedDomainPublisherAccessKeyId || !importedDomainPublisherAccessKeySecret) {
    throw new Error(`Could not get publisher access key ID/secret for: ${siteResourcesStack.somId}`);
  }

  // ----------------------------------------------------------------------
  // Create a secret for the accessKeyId
  const domainPublisherAccessKeyIdSecretName = 'DomainPublisherAccessKeyId';
  await secrets.addSomSecret(
    siteResourcesStack.siteProps.config,
    DEFAULT_AWS_REGION,
    SECRETS_SOURCE_SECRETS_MANAGER,
    siteResourcesStack.siteProps.context.somId,
    domainPublisherAccessKeyIdSecretName,
    importedDomainPublisherAccessKeyId.value
  );

  // Create a secret for the accessKeySecret
  const domainPublisherAccessKeySecretSecretName = 'DomainPublisherAccessKeySecret';
  await secrets.addSomSecret(
    siteResourcesStack.siteProps.config,
    DEFAULT_AWS_REGION,
    SECRETS_SOURCE_SECRETS_MANAGER,
    siteResourcesStack.siteProps.context.somId,
    domainPublisherAccessKeySecretSecretName,
    importedDomainPublisherAccessKeySecret.value
  );

  // ----------------------------------------------------------------------
  // SSM Params
  const res1 = new ssm.StringParameter(siteResourcesStack, 'SsmDomainPublisherAccessKeySecretIdSecretName', {
    parameterName: toSsmParamName(siteResourcesStack.somId, SSM_PARAM_NAME_DOMAIN_PUBLISHER_SECRET_NAME_ACCESS_KEY_ID),
    stringValue: domainPublisherAccessKeyIdSecretName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, res1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const res2 = new ssm.StringParameter(siteResourcesStack, 'SsmDomainPublisherAccessKeySecretSecretSecretName', {
    parameterName: toSsmParamName(
      siteResourcesStack.somId,
      SSM_PARAM_NAME_DOMAIN_PUBLISHER_SECRET_NAME_ACCESS_KEY_SECRET
    ),
    stringValue: domainPublisherAccessKeySecretSecretName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, res2, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  return {
    domainPublisherUserName: importedDomainPublisherUserName,
    domainPublisher,
    domainPublisherAccessKeyIdSecretName,
    domainPublisherAccessKeySecretSecretName,
    ssmParams: [res1, res2],
  };
}
