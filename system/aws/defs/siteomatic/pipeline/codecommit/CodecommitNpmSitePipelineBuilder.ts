import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as ssm from '@aws-cdk/aws-ssm';
import { SITE_PIPELINE_TYPE_CODECOMMIT_NPM } from '../../../../../../lib/consts';
import { CodecommitNpmSitePipelineResources, SitePipelineProps, toSsmParamName } from '../../../../../../lib/types';
import * as CodecommitSitePipelineStack from './BaseCodecommitSitePipelineBuilder';
import { SiteStack } from '../../site/SiteStack';

export async function build(
  siteStack: SiteStack,
  props: SitePipelineProps
): Promise<CodecommitNpmSitePipelineResources> {
  const parentResources = await CodecommitSitePipelineStack.build(siteStack, props);

  // ----------------------------------------------------------------------
  // Code Pipeline
  const codePipeline = new codepipeline.Pipeline(siteStack, 'CodePipeline', {
    pipelineName: siteStack.somId,
  });

  // ----------------------------------------------------------------------
  const sourceOutput = new codepipeline.Artifact();
  const sourceAction = new actions.CodeCommitSourceAction({
    actionName: 'CodeCommitAction',
    repository: parentResources.codeCommitRepo,
    output: sourceOutput,
    branch: 'main',
  });

  // ----------------------------------------------------------------------
  const CodeBuildPipelineProject = new codebuild.PipelineProject(siteStack, 'CodeBuildPipelineProject', {
    projectName: siteStack.somId,
    buildSpec: codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        install: {
          commands: ['npm install'],
        },
        build: {
          commands: ['npm run build'],
        },
      },
    }),
  });

  const buildOutput = new codepipeline.Artifact();
  const CodeBuildAction = new actions.CodeBuildAction({
    actionName: 'CodeBuildAction',
    project: CodeBuildPipelineProject,
    input: sourceOutput,
    outputs: [buildOutput],
  });
  const S3DeployAction = new actions.S3DeployAction({
    actionName: 'S3DeployAction',
    bucket: siteStack.hostingResources.domainBucket,
    input: buildOutput,
  });
  const invalidateAction = new actions.CodeBuildAction({
    actionName: 'InvalidateCache',
    project: parentResources.invalidateCloudfrontCodeBuildProject,
    input: buildOutput,
  });

  // ----------------------------------------------------------------------
  codePipeline.addStage({
    stageName: 'Source',
    actions: [sourceAction],
  });
  codePipeline.addStage({
    stageName: 'Build',
    actions: [CodeBuildAction],
  });
  codePipeline.addStage({
    stageName: 'Deploy',
    actions: [S3DeployAction],
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
    type: SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
    ...parentResources,
    codePipeline,
  };
}
