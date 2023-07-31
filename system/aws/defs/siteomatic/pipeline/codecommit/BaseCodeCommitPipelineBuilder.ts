import { Tags } from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import { toSsmParamName } from '../../../../../../lib/aws/ssm';
import { SOM_TAG_NAME, SSM_PARAM_NAME_CODECOMMIT_CLONE_URL_SSH } from '../../../../../../lib/consts';
import type { BaseCodeCommitSitePipelineResources, PipelineBuilderProps } from '../../../../../../lib/types';
import { _somMeta } from '../../../../../../lib/utils';
import * as SitePipelineStack from '../BasePipelineBuilder';

export async function build(
  scope: Construct,
  props: PipelineBuilderProps
): Promise<BaseCodeCommitSitePipelineResources> {
  if (!props.siteStack.domainUser) {
    throw new Error(`[site-o-matic] Could not build pipeline sub-stack when domainUser is missing`);
  }

  const parentResources = SitePipelineStack.build(scope, props);

  // ----------------------------------------------------------------------
  // CodeCommit git repo
  const codeCommitRepo = new codecommit.Repository(scope, 'CodeCommitRepo', {
    repositoryName: props.siteStack.somId,
  });
  Tags.of(codeCommitRepo).add(SOM_TAG_NAME, props.siteStack.somId);

  // Allow access to the domain role
  codeCommitRepo.grantPullPush(props.siteStack.domainUser);

  // ----------------------------------------------------------------------
  // SSM Params
  const res1 = new ssm.StringParameter(scope, 'SsmCodeCommitCloneUrlSsh', {
    parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_CODECOMMIT_CLONE_URL_SSH),
    stringValue: codeCommitRepo.repositoryCloneUrlSsh,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res1, props.siteStack.somId, props.siteStack.siteProps.protected);

  return {
    ...parentResources,
    codeCommitRepo,
  };
}
