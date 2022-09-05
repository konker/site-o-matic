import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { SITE_PIPELINE_TYPE_CODECOMMIT_NPM, SOM_TAG_NAME } from '../../../../../../lib/consts';
import { CodecommitNpmSitePipelineResources, SitePipelineProps, toSsmParamName } from '../../../../../../lib/types';
import * as CodecommitSitePipelineStack from './BaseCodecommitSitePipelineBuilder';
import { SiteStack } from '../../site/SiteStack';
import { Tags } from 'aws-cdk-lib';

export async function build(
  siteStack: SiteStack,
  props: SitePipelineProps
): Promise<CodecommitNpmSitePipelineResources> {
  const parentResources = await CodecommitSitePipelineStack.build(siteStack, props);

  // ----------------------------------------------------------------------
  const codePipeline = new codepipeline.Pipeline(siteStack, 'CodePipeline', {
    pipelineName: siteStack.somId,
  });
  Tags.of(codePipeline).add(SOM_TAG_NAME, siteStack.somId);

  // ----------------------------------------------------------------------
  const codeBuildPipelineProject = new codebuild.PipelineProject(siteStack, 'CodeBuildPipelineProject', {
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
      artifacts: {
        files: ['**/*'],
      },
    }),
  });

  // ----------------------------------------------------------------------
  const sourceOutput = new codepipeline.Artifact('SourceOutput');
  const buildOutput = new codepipeline.Artifact('BuildOutput');

  const sourceAction = new actions.CodeCommitSourceAction({
    actionName: 'CodeCommitAction',
    repository: parentResources.codeCommitRepo,
    output: sourceOutput,
    branch: 'main',
  });
  const codeBuildAction = new actions.CodeBuildAction({
    actionName: 'CodeBuildAction',
    project: codeBuildPipelineProject,
    input: sourceOutput,
    outputs: [buildOutput],
  });
  const deployAction = new actions.S3DeployAction({
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
    actions: [codeBuildAction],
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
  new ssm.StringParameter(siteStack, 'SsmCodePipelineArn', {
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
