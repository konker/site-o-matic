import * as codecommit from '@aws-cdk/aws-codecommit';
import * as ssm from '@aws-cdk/aws-ssm';
import { BaseCodecommitSitePipelineResources, SitePipelineProps, toSsmParamName } from '../../../../../../lib/types';
import { SiteStack } from '../../site/SiteStack';
import * as SitePipelineStack from '../BaseSitePipelineBuilder';

export async function build(
  siteStack: SiteStack,
  props: SitePipelineProps
): Promise<BaseCodecommitSitePipelineResources> {
  const parentResources = await SitePipelineStack.build(siteStack, props);

  // ----------------------------------------------------------------------
  // CodeCommit git repo
  const codeCommitRepo = new codecommit.Repository(siteStack, 'CodeCommitRepo', {
    repositoryName: siteStack.somId,
  });
  codeCommitRepo.grantPullPush(siteStack.domainUser);

  // ----------------------------------------------------------------------
  // SSM Params
  new ssm.StringParameter(siteStack, 'SSmCodeCommitCloneUrlSsh', {
    parameterName: toSsmParamName(siteStack.somId, 'code-commit-clone-url-ssh'),
    stringValue: codeCommitRepo.repositoryCloneUrlSsh,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });

  return {
    ...parentResources,
    codeCommitRepo,
  };
}
