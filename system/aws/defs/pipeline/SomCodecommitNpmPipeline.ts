import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import { formulateStackName } from './lib';
import { SomPipelineProps, SomSiteProps } from '../../../../lib';
import { SOM_TAG_NAME } from '../common';
import { CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM } from '../../../../content';

export class SomCodecommitNpmPipelineStack extends cdk.NestedStack implements SomSiteProps {
  public readonly rootDomain: string;
  public readonly webmasterEmail: string;
  public readonly contentProducerId: string;
  public readonly protected: boolean;
  public readonly somId: string;
  public readonly pipelineProps: SomPipelineProps;

  constructor(scope: cdk.Construct, siteProps: SomSiteProps, pipelineProps: SomPipelineProps) {
    super(scope, formulateStackName(siteProps.rootDomain, CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM));

    this.rootDomain = siteProps.rootDomain;
    this.webmasterEmail = siteProps.webmasterEmail;
    this.contentProducerId = siteProps.contentProducerId;
    this.protected = siteProps.protected;
    this.somId = formulateStackName(siteProps.rootDomain, CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM);
    this.pipelineProps = pipelineProps;
  }

  async build(scope: cdk.Construct) {
    cdk.Tags.of(this).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // Codecommit git repo
    const CodeCommitCfnRepo = new codecommit.CfnRepository(this, 'CodeCommitCfnRepo', {
      repositoryName: this.somId,
      code: {
        branchName: 'main',
        s3: {
          bucket: this.pipelineProps.contentBucket.bucketName,
          key: '/',
        },
      },
    });
    const CodeCommitRepo = codecommit.Repository.fromRepositoryArn(this, 'CodeCommitRepo', CodeCommitCfnRepo.attrArn);
    cdk.Tags.of(CodeCommitRepo).add(SOM_TAG_NAME, this.somId);

    const CodePipeline = new codepipeline.Pipeline(this, 'CodePipeline', {
      pipelineName: this.somId,
    });
    cdk.Tags.of(CodePipeline).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new actions.CodeCommitSourceAction({
      actionName: 'CodeCommitAction',
      repository: CodeCommitRepo,
      output: sourceOutput,
      branch: 'main',
    });

    // ----------------------------------------------------------------------
    const buildOutput = new codepipeline.Artifact();
    const CodeBuildPipelineProject = new codebuild.PipelineProject(this, 'CodeBuildPipelineProject', {
      projectName: this.somId,
      badge: true,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.1',
        phases: {
          install: {
            commands: 'npm install',
          },
          build: {
            commands: ['npm run build'],
          },
        },
      }),
    });
    const CodeBuildAction = new actions.CodeBuildAction({
      actionName: 'CodeBuildAction',
      project: CodeBuildPipelineProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    // ----------------------------------------------------------------------
    const S3DeployAction = new actions.S3DeployAction({
      actionName: 'S3DeployAction',
      bucket: this.pipelineProps.contentBucket,
      input: buildOutput,
    });

    // ----------------------------------------------------------------------
    CodePipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });
    CodePipeline.addStage({
      stageName: 'Build',
      actions: [CodeBuildAction],
    });
    CodePipeline.addStage({
      stageName: 'Deploy',
      actions: [S3DeployAction],
    });

    // ----------------------------------------------------------------------
    // Outputs
    new cdk.CfnOutput(this, 'OutputRootDomainName', {
      description: 'Root domain name',
      value: this.rootDomain,
    });
    new cdk.CfnOutput(this, 'OutputCodepipeline', {
      description: 'Codepipeline ARN',
      value: CodePipeline.pipelineArn,
    });
  }
}
