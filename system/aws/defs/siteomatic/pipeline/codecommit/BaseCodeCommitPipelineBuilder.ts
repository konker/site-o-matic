import { Tags } from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import { toSsmParamName } from '../../../../../../lib/aws/ssm';
import { SITE_PIPELINE_CODECOMMIT_BRANCH_NAME, SOM_TAG_NAME } from '../../../../../../lib/consts';
import type { BaseCodeCommitSitePipelineResources, PipelineBuilderProps } from '../../../../../../lib/types';
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
  const siteContentTmpDirPath = props.siteStack.siteProps.siteContentTmpDirPath;
  const repoProps = Object.assign(
    {
      repositoryName: props.siteStack.somId,
    },
    siteContentTmpDirPath
      ? { code: codecommit.Code.fromDirectory(siteContentTmpDirPath, SITE_PIPELINE_CODECOMMIT_BRANCH_NAME) }
      : {}
  );
  console.log(`[site-o-matic] Initializing CodeCommit repo with zip file: ${siteContentTmpDirPath}`);

  const codeCommitRepo = new codecommit.Repository(scope, 'CodeCommitRepo', repoProps);
  Tags.of(codeCommitRepo).add(SOM_TAG_NAME, props.siteStack.somId);

  // Allow access to the domain role
  codeCommitRepo.grantPullPush(props.siteStack.domainUser);

  // ----------------------------------------------------------------------
  // SSM Params
  new ssm.StringParameter(scope, 'SsmCodeCommitCloneUrlSsh', {
    parameterName: toSsmParamName(props.siteStack.somId, 'code-commit-clone-url-ssh'),
    stringValue: codeCommitRepo.repositoryCloneUrlSsh,
    tier: ssm.ParameterTier.STANDARD,
  });

  return {
    ...parentResources,
    codeCommitRepo,
  };
}
