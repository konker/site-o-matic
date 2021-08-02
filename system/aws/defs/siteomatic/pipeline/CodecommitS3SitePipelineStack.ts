import * as cdk from '@aws-cdk/core';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as ssm from '@aws-cdk/aws-ssm';
import { SiteProps } from '../../../../../lib';
import { SitePipelineProps, SOM_TAG_NAME, toSsmParamName } from '../common';
import { CodecommitSitePipelineStack } from './CodecommitSitePipelineStack';

export class CodecommitS3SitePipelineStack extends CodecommitSitePipelineStack {
  public codePipeline: codepipeline.Pipeline;

  constructor(scope: cdk.Construct, siteProps: SiteProps, props: SitePipelineProps) {
    super(scope, siteProps, props);
  }

  async build() {
    await super.build();

    // ----------------------------------------------------------------------
    // Code Pipeline
    this.codePipeline = new codepipeline.Pipeline(this, 'CodePipeline', {
      pipelineName: this.somId,
    });
    cdk.Tags.of(this.codePipeline).add(SOM_TAG_NAME, this.somId);

    const sourceOutput = new codepipeline.Artifact();
    const CodeCommitAction = new actions.CodeCommitSourceAction({
      actionName: 'CodeCommitAction',
      repository: this.codeCommitRepo,
      output: sourceOutput,
      branch: 'main',
    });
    const deployAction = new actions.S3DeployAction({
      actionName: 'S3DeployAction',
      bucket: this.domainBucket,
      input: sourceOutput,
    });
    const invalidateAction = new actions.CodeBuildAction({
      actionName: 'InvalidateCache',
      project: this.invalidateCloudfrontCodeBuildProject,
      input: sourceOutput,
    });

    this.codePipeline.addStage({
      stageName: 'Source',
      actions: [CodeCommitAction],
    });
    this.codePipeline.addStage({
      stageName: 'Deploy',
      actions: [deployAction],
    });
    this.codePipeline.addStage({
      stageName: 'Invalidate',
      actions: [invalidateAction],
    });

    // ----------------------------------------------------------------------
    // SSM Params
    new ssm.StringParameter(this, 'SSmCodePipelineArn', {
      parameterName: toSsmParamName(this.somId, 'code-pipeline-arn'),
      stringValue: this.codePipeline.pipelineArn,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
  }
}
