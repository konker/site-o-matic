import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import { toSsmParamName } from '../../../../../../lib/aws/ssm';
import {
  DEFAULT_AWS_REGION,
  SITE_PIPELINE_CODECOMMIT_BRANCH_NAME,
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
} from '../../../../../../lib/consts';
import type { CodeCommitS3SitePipelineResources, PipelineBuilderProps } from '../../../../../../lib/types';
import { _somMeta } from '../../../../../../lib/utils';
import * as CodeCommitSitePipelineStack from './BaseCodeCommitPipelineBuilder';

export async function build(scope: Construct, props: PipelineBuilderProps): Promise<CodeCommitS3SitePipelineResources> {
  if (!props.siteStack.hostingResources) {
    throw new Error(`[site-o-matic] Could not build pipeline sub-stack when hostingResources is missing`);
  }

  const parentResources = await CodeCommitSitePipelineStack.build(scope, props);

  // ----------------------------------------------------------------------
  // Code Pipeline
  const codePipeline = new codepipeline.Pipeline(scope, 'CodePipeline', {
    pipelineName: props.siteStack.somId,
    crossAccountKeys: false,
  });
  _somMeta(codePipeline, props.siteStack.somId, props.siteStack.siteProps.protected);

  const sourceOutput = new codepipeline.Artifact();
  const sourceAction = new actions.CodeCommitSourceAction({
    actionName: 'SourceAction',
    repository: parentResources.codeCommitRepo,
    output: sourceOutput,
    branch: SITE_PIPELINE_CODECOMMIT_BRANCH_NAME,
  });
  const deployAction = new actions.S3DeployAction({
    actionName: 'S3DeployAction',
    bucket: props.siteStack.hostingResources.domainBucket,
    input: sourceOutput,
  });
  const invalidateAction = new actions.CodeBuildAction({
    actionName: 'InvalidateCache',
    project: parentResources.invalidateCloudfrontCodeBuildProject,
    input: sourceOutput,
  });

  codePipeline.addStage({
    stageName: 'Source',
    actions: [sourceAction],
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
    parameterName: toSsmParamName(props.siteStack.somId, 'code-pipeline-arn'),
    stringValue: codePipeline.pipelineArn,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res1, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res2 = new ssm.StringParameter(scope, 'SsmCodePipelineConsoleUrl', {
    parameterName: toSsmParamName(props.siteStack.somId, 'code-pipeline-console-url'),
    stringValue: `https://${
      props.siteStack.siteProps.env?.region ?? DEFAULT_AWS_REGION
    }.console.aws.amazon.com/codesuite/codepipeline/pipelines/${codePipeline.pipelineName}/view`,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res2, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res3 = new ssm.StringParameter(scope, 'SsmCodePipelineConsoleUrl', {
    parameterName: toSsmParamName(props.siteStack.somId, 'code-pipeline-console-url'),
    stringValue: `https://${
      props.siteStack.siteProps.env?.region ?? DEFAULT_AWS_REGION
    }.console.aws.amazon.com/codesuite/codepipeline/pipelines/${codePipeline.pipelineName}/view`,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res3, props.siteStack.somId, props.siteStack.siteProps.protected);

  return {
    type: SITE_PIPELINE_TYPE_CODECOMMIT_S3,
    ...parentResources,
    codePipeline,
  };
}
