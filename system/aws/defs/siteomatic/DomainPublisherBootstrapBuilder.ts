import { CfnOutput } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  CF_OUTPUT_NAME_DOMAIN_PUBLISHER_ACCESS_KEY_ID,
  CF_OUTPUT_NAME_DOMAIN_PUBLISHER_ACCESS_KEY_SECRET,
  CF_OUTPUT_NAME_DOMAIN_PUBLISHER_USER_NAME,
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
  // Create domainPublisher user
  const domainPublisherUserName = formulateIamUserName('publisher', siteBootstrapStack.somId);
  const domainPublisher = new iam.User(siteBootstrapStack, 'BootstrapDomainPublisher', {
    userName: domainPublisherUserName,
  });
  _somMeta(
    siteBootstrapStack.siteProps.config,
    domainPublisher,
    siteBootstrapStack.somId,
    siteBootstrapStack.siteProps.locked
  );

  // Export [access_id, access_secret] for domainPublisher
  const domainPublisherAccessKey = new iam.AccessKey(siteBootstrapStack, 'DomainPublisherAccessKey', {
    user: domainPublisher as iam.IUser,
  });

  // ----------------------------------------------------------------------
  // Cloudformation Outputs
  new CfnOutput(siteBootstrapStack, 'OutputDomainPublisherUserName', {
    value: domainPublisherUserName,
    exportName: CF_OUTPUT_NAME_DOMAIN_PUBLISHER_USER_NAME,
  });
  new CfnOutput(siteBootstrapStack, 'OutputDomainPublisherAccessKeyId', {
    value: domainPublisherAccessKey.accessKeyId,
    exportName: CF_OUTPUT_NAME_DOMAIN_PUBLISHER_ACCESS_KEY_ID,
  });
  new CfnOutput(siteBootstrapStack, 'OutputDomainPublisherAccessKeySecret', {
    value: domainPublisherAccessKey.secretAccessKey.unsafeUnwrap(),
    exportName: CF_OUTPUT_NAME_DOMAIN_PUBLISHER_ACCESS_KEY_SECRET,
  });

  // ----------------------------------------------------------------------
  // SSM Params
  const res1 = new ssm.StringParameter(siteBootstrapStack, 'SsmDomainPublisherUserName', {
    parameterName: toSsmParamName(siteBootstrapStack.somId, SSM_PARAM_NAME_DOMAIN_PUBLISHER_USER_NAME),
    stringValue: domainPublisherUserName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteBootstrapStack.siteProps.config, res1, siteBootstrapStack.somId, siteBootstrapStack.siteProps.locked);

  return {
    domainPublisherUserName,
    domainPublisher,
    domainPublisherAccessKey,
    ssmParams: [res1],
  };
}
