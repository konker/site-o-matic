import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import { toSsmParamName } from '../../../../../../lib/aws/ssm';
import {
  DEFAULT_AWS_REGION,
  SITE_PIPELINE_CODECOMMIT_BRANCH_NAME,
  SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM,
  SSM_PARAM_NAME_CODE_PIPELINE_ARN,
  SSM_PARAM_NAME_CODE_PIPELINE_CONSOLE_URL,
  SSM_PARAM_NAME_CODE_PIPELINE_NAME,
} from '../../../../../../lib/consts';
import type {
  CodeCommitCustomSitePipelineResources,
  PipelineBuilderProps,
  SomConfig,
} from '../../../../../../lib/types';
import { _somMeta } from '../../../../../../lib/utils';
import * as CodeCommitSitePipelineStack from './BaseCodeCommitPipelineBuilder';

export async function build(
  scope: Construct,
  config: SomConfig,
  props: PipelineBuilderProps
): Promise<CodeCommitCustomSitePipelineResources> {
  if (!props.siteStack.hostingResources) {
    throw new Error(`[site-o-matic] Could not build pipeline sub-stack when hostingResources is missing`);
  }
  if (props.siteStack?.siteProps?.context?.manifest?.pipeline?.type !== SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM) {
    throw new Error(`[site-o-matic] Could not build pipeline sub-stack with incorrect pipeline type`);
  }

  const parentResources = await CodeCommitSitePipelineStack.build(scope, config, props);
  const buildPhases = props.siteStack?.siteProps?.context?.manifest?.pipeline?.buildPhases;

  // ----------------------------------------------------------------------
  const codePipeline = new codepipeline.Pipeline(scope, 'CodePipeline', {
    pipelineName: props.siteStack.somId,
    crossAccountKeys: false,
  });
  _somMeta(config, codePipeline, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  const codeBuildPipelineProject = new codebuild.PipelineProject(scope, 'CodeBuildPipelineProject', {
    projectName: props.siteStack.somId,
    buildSpec: codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: buildPhases,
      artifacts: {
        files: ['**/*'],
      },
    }),
  });
  _somMeta(config, codeBuildPipelineProject, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  const sourceOutput = new codepipeline.Artifact('SourceOutput');
  const buildOutput = new codepipeline.Artifact('BuildOutput');

  const sourceAction = new actions.CodeCommitSourceAction({
    actionName: 'SourceAction',
    repository: parentResources.codeCommitRepo,
    output: sourceOutput,
    branch: SITE_PIPELINE_CODECOMMIT_BRANCH_NAME,
  });
  const codeBuildAction = new actions.CodeBuildAction({
    actionName: 'CodeBuildAction',
    project: codeBuildPipelineProject,
    input: sourceOutput,
    outputs: [buildOutput],
  });
  const deployAction = new actions.S3DeployAction({
    actionName: 'S3DeployAction',
    bucket: props.siteStack.hostingResources.domainBucket,
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
  const res1 = new ssm.StringParameter(scope, 'SsmCodePipelineArn', {
    parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_CODE_PIPELINE_ARN),
    stringValue: codePipeline.pipelineArn,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(config, res1, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res2 = new ssm.StringParameter(scope, 'SsmCodePipelineName', {
    parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_CODE_PIPELINE_NAME),
    stringValue: codePipeline.pipelineName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(config, res2, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res3 = new ssm.StringParameter(scope, 'SsmCodePipelineConsoleUrl', {
    parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_CODE_PIPELINE_CONSOLE_URL),
    stringValue: `https://${
      props.siteStack.siteProps.env?.region ?? DEFAULT_AWS_REGION
    }.console.aws.amazon.com/codesuite/codepipeline/pipelines/${codePipeline.pipelineName}/view`,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(config, res3, props.siteStack.somId, props.siteStack.siteProps.protected);

  return {
    type: SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM,
    ...parentResources,
    codePipeline,
  };
}
