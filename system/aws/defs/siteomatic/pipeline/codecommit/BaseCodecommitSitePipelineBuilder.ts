import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { BaseCodecommitSitePipelineResources, SitePipelineProps, toSsmParamName } from '../../../../../../lib/types';
import { SiteStack } from '../../site/SiteStack';
import * as SitePipelineStack from '../BaseSitePipelineBuilder';
import { Tags } from 'aws-cdk-lib';
import { SOM_TAG_NAME } from '../../../../../../lib/consts';

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
  Tags.of(codeCommitRepo).add(SOM_TAG_NAME, siteStack.somId);

  // Allow access to the domain role
  codeCommitRepo.grantPullPush(siteStack.domainUser);

  // ----------------------------------------------------------------------
  // SSM Params
  new ssm.StringParameter(siteStack, 'SsmCodeCommitCloneUrlSsh', {
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
