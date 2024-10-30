import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import * as cloudformation from '../../../../lib/aws/cloudformation';
import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  BOOTSTRAP_DOMAIN_PUBLISHER_ACCESS_KEY_ID_OUTPUT_NAME,
  BOOTSTRAP_DOMAIN_PUBLISHER_ACCESS_KEY_SECRET_OUTPUT_NAME,
  BOOTSTRAP_DOMAIN_PUBLISHER_USER_NAME_OUTPUT_NAME,
  DEFAULT_AWS_REGION,
  SSM_PARAM_NAME_DOMAIN_PUBLISHER_SECRET_NAME_ACCESS_KEY_ID,
  SSM_PARAM_NAME_DOMAIN_PUBLISHER_SECRET_NAME_ACCESS_KEY_SECRET,
} from '../../../../lib/consts';
import * as secrets from '../../../../lib/secrets';
import { DEFAULT_SECRETS_SOURCE } from '../../../../lib/secrets/types';
import { _somMeta } from '../../../../lib/utils';
import type { SiteResourcesStack } from './SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type DomainPublisherResources = {
  readonly domainPublisherUserName: string;
  readonly domainPublisher: iam.IUser;
  readonly domainPublisherPolicy: iam.Policy;
  readonly domainPublisherAccessKeyIdSecretName: string;
  readonly domainPublisherAccessKeySecretSecretName: string;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesStack): Promise<DomainPublisherResources> {
  const importedDomainPublisherUserName = cdk.Fn.importValue(
    BOOTSTRAP_DOMAIN_PUBLISHER_USER_NAME_OUTPUT_NAME(siteResourcesStack.somId)
  );

  const domainPublisher = iam.User.fromUserName(siteResourcesStack, 'DomainPublisher', importedDomainPublisherUserName);
  const domainPublisherPolicy = new iam.Policy(siteResourcesStack, 'DomainPublisherPolicy', {
    statements: [],
  });
  _somMeta(
    siteResourcesStack.siteProps.config,
    domainPublisherPolicy,
    siteResourcesStack.somId,
    siteResourcesStack.siteProps.locked
  );

  const domainPublisherAccessKeyIdSecretName = 'DOMAIN_PUBLISHER_AWS_ACCESS_KEY_ID';
  const manuallyImportedDomainPublisherAccessKeyId = await cloudformation.getCloudformationExport(
    siteResourcesStack.siteProps.config,
    DEFAULT_AWS_REGION,
    BOOTSTRAP_DOMAIN_PUBLISHER_ACCESS_KEY_ID_OUTPUT_NAME(siteResourcesStack.somId)
  );

  const domainPublisherAccessKeySecretSecretName = 'DOMAIN_PUBLISHER_AWS_ACCESS_KEY_SECRET';
  const manuallyImportedDomainPublisherAccessKeySecret = await cloudformation.getCloudformationExport(
    siteResourcesStack.siteProps.config,
    DEFAULT_AWS_REGION,
    BOOTSTRAP_DOMAIN_PUBLISHER_ACCESS_KEY_SECRET_OUTPUT_NAME(siteResourcesStack.somId)
  );

  if (manuallyImportedDomainPublisherAccessKeyId && manuallyImportedDomainPublisherAccessKeySecret) {
    // ----------------------------------------------------------------------
    // Create a secret for the accessKeyId
    await secrets.addSomSecret(
      siteResourcesStack.siteProps.config,
      DEFAULT_AWS_REGION,
      siteResourcesStack.somId,
      DEFAULT_SECRETS_SOURCE,
      siteResourcesStack.somId,
      domainPublisherAccessKeyIdSecretName,
      manuallyImportedDomainPublisherAccessKeyId.value
    );

    // Create a secret for the accessKeySecret
    await secrets.addSomSecret(
      siteResourcesStack.siteProps.config,
      DEFAULT_AWS_REGION,
      siteResourcesStack.somId,
      DEFAULT_SECRETS_SOURCE,
      siteResourcesStack.somId,
      domainPublisherAccessKeySecretSecretName,
      manuallyImportedDomainPublisherAccessKeySecret.value
    );
  }

  // ----------------------------------------------------------------------
  // SSM Params
  const res1 = new ssm.StringParameter(siteResourcesStack, 'SsmDomainPublisherAccessKeySecretIdSecretName', {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.somId,
      SSM_PARAM_NAME_DOMAIN_PUBLISHER_SECRET_NAME_ACCESS_KEY_ID
    ),
    stringValue: domainPublisherAccessKeyIdSecretName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, res1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const res2 = new ssm.StringParameter(siteResourcesStack, 'SsmDomainPublisherAccessKeySecretSecretSecretName', {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
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
    domainPublisherPolicy,
    domainPublisherAccessKeyIdSecretName,
    domainPublisherAccessKeySecretSecretName,
    ssmParams: [res1, res2],
  };
}
