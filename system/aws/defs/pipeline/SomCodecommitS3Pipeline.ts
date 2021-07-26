import * as cdk from '@aws-cdk/core';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import { formulateStackName } from './lib';
import { SOM_TAG_NAME } from '../common';
import { SomPipelineProps, SomSiteProps } from '../../../../lib';
import { CONTENT_PIPELINE_TYPE_CODECOMMIT_S3 } from '../../../../content';

export class SomCodecommitS3PipelineStack extends cdk.NestedStack implements SomSiteProps {
  public readonly rootDomain: string;
  public readonly webmasterEmail: string;
  public readonly contentProducerId: string;
  public readonly protected: boolean;
  public readonly somId: string;
  public readonly pipelineProps: SomPipelineProps;

  constructor(scope: cdk.Construct, siteProps: SomSiteProps, pipelineProps: SomPipelineProps) {
    super(scope, formulateStackName(siteProps.rootDomain, CONTENT_PIPELINE_TYPE_CODECOMMIT_S3));

    this.rootDomain = siteProps.rootDomain;
    this.webmasterEmail = siteProps.webmasterEmail;
    this.contentProducerId = siteProps.contentProducerId;
    this.protected = siteProps.protected;
    this.somId = formulateStackName(siteProps.rootDomain, CONTENT_PIPELINE_TYPE_CODECOMMIT_S3);
    this.pipelineProps = pipelineProps;
  }

  async build(scope: cdk.Construct) {
    cdk.Tags.of(this).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // Codecommit git repo
    const CodeCommitRepo = new codecommit.Repository(this, 'CodeCommitRepo', {
      repositoryName: this.somId,
    });
    CodeCommitRepo.grantPullPush(this.pipelineProps.domainUser)
    cdk.Tags.of(CodeCommitRepo).add(SOM_TAG_NAME, this.somId);

    const CodePipeline = new codepipeline.Pipeline(this, 'CodePipeline', {
      pipelineName: this.somId,
    });
    cdk.Tags.of(CodePipeline).add(SOM_TAG_NAME, this.somId);

    const sourceOutput = new codepipeline.Artifact();
    const CodeCommitAction = new actions.CodeCommitSourceAction({
      actionName: 'CodeCommitAction',
      repository: CodeCommitRepo,
      output: sourceOutput,
      branch: 'main',
    });
    const deployAction = new actions.S3DeployAction({
      actionName: 'S3DeployAction',
      bucket: this.pipelineProps.contentBucket,
      input: sourceOutput,
    });

    CodePipeline.addStage({
      stageName: 'Source',
      actions: [CodeCommitAction],
    });
    CodePipeline.addStage({
      stageName: 'Deploy',
      actions: [deployAction],
    });

    // ----------------------------------------------------------------------
    // Outputs
    new cdk.CfnOutput(this, 'OutputRootDomainName', {
      description: 'Root domain name',
      value: this.rootDomain,
    });
    new cdk.CfnOutput(this, 'OutputCodePipeline', {
      description: 'Codepipeline ARN',
      value: CodePipeline.pipelineArn,
    });
    new cdk.CfnOutput(this, 'OutputCodeCommitCloneUrlSsh', {
      description: 'CodeCommit Repo',
      value: CodeCommitRepo.repositoryCloneUrlSsh,
    });
  }
}
