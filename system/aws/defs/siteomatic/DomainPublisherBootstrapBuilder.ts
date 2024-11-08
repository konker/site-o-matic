import { CfnOutput } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  BOOTSTRAP_DOMAIN_PUBLISHER_ACCESS_KEY_ID_OUTPUT_NAME,
  BOOTSTRAP_DOMAIN_PUBLISHER_ACCESS_KEY_SECRET_OUTPUT_NAME,
  BOOTSTRAP_DOMAIN_PUBLISHER_USER_NAME_OUTPUT_NAME,
  SSM_PARAM_NAME_DOMAIN_PUBLISHER_USER_NAME,
} from '../../../../lib/consts';
import { _somMeta, formulateIamUserName } from '../../../../lib/utils';
import type { SiteBootstrapStack } from './SiteStack/SiteBootstrapStack';

// ----------------------------------------------------------------------
export type DomainPublisherBootstrapResources = {
  readonly domainPublisherUserName: string;
  readonly domainPublisher: iam.User;
  readonly domainPublisherAccessKey: iam.AccessKey;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteBootstrapStack: SiteBootstrapStack): Promise<DomainPublisherBootstrapResources> {
  // ----------------------------------------------------------------------
  // Create domainPublisher user
  const domainPublisherUserName = formulateIamUserName('publisher', siteBootstrapStack.siteProps.context.somId);
  const domainPublisher = new iam.User(siteBootstrapStack, 'BootstrapDomainPublisher', {
    userName: domainPublisherUserName,
  });
  _somMeta(
    siteBootstrapStack.siteProps.config,
    domainPublisher,
    siteBootstrapStack.siteProps.context.somId,
    siteBootstrapStack.siteProps.locked
  );

  // ----------------------------------------------------------------------
  // Export [access_id, access_secret] for domainPublisher
  const domainPublisherAccessKey = new iam.AccessKey(siteBootstrapStack, 'DomainPublisherAccessKey', {
    user: domainPublisher as iam.IUser,
  });

  // ----------------------------------------------------------------------
  // Cloudformation Outputs
  new CfnOutput(siteBootstrapStack, 'OutputDomainPublisherUserName', {
    value: domainPublisherUserName,
    exportName: BOOTSTRAP_DOMAIN_PUBLISHER_USER_NAME_OUTPUT_NAME(siteBootstrapStack.siteProps.context.somId),
  });
  new CfnOutput(siteBootstrapStack, 'OutputDomainPublisherAccessKeyId', {
    value: domainPublisherAccessKey.accessKeyId,
    exportName: BOOTSTRAP_DOMAIN_PUBLISHER_ACCESS_KEY_ID_OUTPUT_NAME(siteBootstrapStack.siteProps.context.somId),
  });
  new CfnOutput(siteBootstrapStack, 'OutputDomainPublisherAccessKeySecret', {
    value: domainPublisherAccessKey.secretAccessKey.unsafeUnwrap(),
    exportName: BOOTSTRAP_DOMAIN_PUBLISHER_ACCESS_KEY_SECRET_OUTPUT_NAME(siteBootstrapStack.siteProps.context.somId),
  });

  // ----------------------------------------------------------------------
  // SSM Params
  const res1 = new ssm.StringParameter(siteBootstrapStack, 'SsmDomainPublisherUserName', {
    parameterName: toSsmParamName(
      siteBootstrapStack.siteProps.config,
      siteBootstrapStack.siteProps.context.somId,
      SSM_PARAM_NAME_DOMAIN_PUBLISHER_USER_NAME
    ),
    stringValue: domainPublisherUserName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(
    siteBootstrapStack.siteProps.config,
    res1,
    siteBootstrapStack.siteProps.context.somId,
    siteBootstrapStack.siteProps.locked
  );

  return {
    domainPublisherUserName,
    domainPublisher,
    domainPublisherAccessKey,
    ssmParams: [res1],
  };
}
