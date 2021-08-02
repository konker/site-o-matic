import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as ssm from '@aws-cdk/aws-ssm';
import { SiteProps } from '../../../../../lib';
import { SitePipelineProps, SOM_TAG_NAME, toSsmParamName } from '../common';
import { CodecommitSitePipelineStack } from './CodecommitSitePipelineStack';

export class CodecommitNpmSitePipelineStack extends CodecommitSitePipelineStack {
  public codeCommitRepo: codecommit.Repository;
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

    // ----------------------------------------------------------------------
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new actions.CodeCommitSourceAction({
      actionName: 'CodeCommitAction',
      repository: this.codeCommitRepo,
      output: sourceOutput,
      branch: 'main',
    });

    // ----------------------------------------------------------------------
    const CodeBuildPipelineProject = new codebuild.PipelineProject(this, 'CodeBuildPipelineProject', {
      projectName: this.somId,
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
      bucket: this.domainBucket,
      input: buildOutput,
    });
    const invalidateAction = new actions.CodeBuildAction({
      actionName: 'InvalidateCache',
      project: this.invalidateCloudfrontCodeBuildProject,
      input: buildOutput,
    });

    // ----------------------------------------------------------------------
    this.codePipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });
    this.codePipeline.addStage({
      stageName: 'Build',
      actions: [CodeBuildAction],
    });
    this.codePipeline.addStage({
      stageName: 'Deploy',
      actions: [S3DeployAction],
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
