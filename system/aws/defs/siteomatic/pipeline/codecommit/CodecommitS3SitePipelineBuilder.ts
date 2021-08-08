import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as ssm from '@aws-cdk/aws-ssm';
import { SITE_PIPELINE_TYPE_CODECOMMIT_S3 } from '../../../../../../lib/consts';
import { CodecommitS3SitePipelineResources, SitePipelineProps, toSsmParamName } from '../../../../../../lib/types';
import { SiteStack } from '../../site/SiteStack';
import * as CodecommitSitePipelineStack from './BaseCodecommitSitePipelineBuilder';

export async function build(
  siteStack: SiteStack,
  props: SitePipelineProps
): Promise<CodecommitS3SitePipelineResources> {
  const parentResources = await CodecommitSitePipelineStack.build(siteStack, props);

  // ----------------------------------------------------------------------
  // Code Pipeline
  const codePipeline = new codepipeline.Pipeline(siteStack, 'CodePipeline', {
    pipelineName: siteStack.somId,
  });

  const sourceOutput = new codepipeline.Artifact();
  const CodeCommitAction = new actions.CodeCommitSourceAction({
    actionName: 'CodeCommitAction',
    repository: parentResources.codeCommitRepo,
    output: sourceOutput,
    branch: 'main',
  });
  const deployAction = new actions.S3DeployAction({
    actionName: 'S3DeployAction',
    bucket: siteStack.hostingResources.domainBucket,
    input: sourceOutput,
  });
  const invalidateAction = new actions.CodeBuildAction({
    actionName: 'InvalidateCache',
    project: parentResources.invalidateCloudfrontCodeBuildProject,
    input: sourceOutput,
  });

  codePipeline.addStage({
    stageName: 'Source',
    actions: [CodeCommitAction],
  });
  codePipeline.addStage({
    stageName: 'Deploy',
    actions: [deployAction],
  });
  codePipeline.addStage({
    stageName: 'Invalidate',
    actions: [invalidateAction],
  });

  // ----------------------------------------------------------------------
  // SSM Params
  new ssm.StringParameter(siteStack, 'SSmCodePipelineArn', {
    parameterName: toSsmParamName(siteStack.somId, 'code-pipeline-arn'),
    stringValue: codePipeline.pipelineArn,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });

  return {
    type: SITE_PIPELINE_TYPE_CODECOMMIT_S3,
    ...parentResources,
    codePipeline,
  };
}