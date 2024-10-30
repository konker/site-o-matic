import { CfnOutput } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  BOOTSTRAP_DOMAIN_USER_USER_NAME_OUTPUT_NAME,
  SSM_PARAM_NAME_DOMAIN_USER_USER_NAME,
} from '../../../../lib/consts';
import { _somMeta, formulateIamUserName } from '../../../../lib/utils';
import type { SiteBootstrapStack } from './SiteStack/SiteBootstrapStack';

// ----------------------------------------------------------------------
export type DomainUserBootstrapResources = {
  readonly domainUserName: string;
  readonly domainUser: iam.User;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteBootstrapStack: SiteBootstrapStack): Promise<DomainUserBootstrapResources> {
  const domainUserName = formulateIamUserName('user', siteBootstrapStack.somId);
  const domainUser = new iam.User(siteBootstrapStack, 'BootstrapDomainUser', {
    userName: domainUserName,
  });
  _somMeta(
    siteBootstrapStack.siteProps.config,
    domainUser,
    siteBootstrapStack.somId,
    siteBootstrapStack.siteProps.locked
  );

  // ----------------------------------------------------------------------
  // Cloudformation Outputs
  new CfnOutput(siteBootstrapStack, 'OutputDomainUserName', {
    value: domainUserName,
    exportName: BOOTSTRAP_DOMAIN_USER_USER_NAME_OUTPUT_NAME(siteBootstrapStack.somId),
  });

  // ----------------------------------------------------------------------
  // SSM Params
  const res1 = new ssm.StringParameter(siteBootstrapStack, 'SsmDomainUserName', {
    parameterName: toSsmParamName(
      siteBootstrapStack.siteProps.config,
      siteBootstrapStack.somId,
      SSM_PARAM_NAME_DOMAIN_USER_USER_NAME
    ),
    stringValue: domainUserName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteBootstrapStack.siteProps.config, res1, siteBootstrapStack.somId, siteBootstrapStack.siteProps.locked);

  return {
    domainUserName,
    domainUser,
    ssmParams: [res1],
  };
}
