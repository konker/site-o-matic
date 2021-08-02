import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import { formulateStackName } from './lib';
import { SiteProps } from '../../../../../lib';
import { ContentPipelineType } from '../../../../../content';
import { SitePipelineProps, SOM_TAG_NAME } from '../common';

export abstract class SitePipelineStack extends cdk.NestedStack {
  public readonly siteProps: SiteProps;
  public readonly somId: string;
  public readonly domainUser: iam.User;
  public readonly pipelineType: ContentPipelineType;
  public readonly domainBucket: s3.Bucket;
  public readonly cloudfrontDistributionId: string;

  public invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;

  protected constructor(scope: cdk.Construct, siteProps: SiteProps, props: SitePipelineProps) {
    super(scope, formulateStackName(siteProps.rootDomain, props.pipelineType));

    this.siteProps = siteProps;
    this.somId = props.somId;
    this.domainUser = props.domainUser;
    this.pipelineType = props.pipelineType;
    this.domainBucket = props.domainBucket;
    this.cloudfrontDistributionId = props.cloudfrontDistributionId;
  }

  async build() {
    cdk.Tags.of(this).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // CodeBuild project for invalidating the cloudfront cache
    this.invalidateCloudfrontCodeBuildProject = new codebuild.PipelineProject(this, `InvalidateCloudfront`, {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: ['aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_ID} --paths "/*"'],
          },
        },
      }),
      environmentVariables: {
        CLOUDFRONT_ID: { value: this.cloudfrontDistributionId },
      },
    });

    // Add Cloudfront invalidation permissions to the project
    const distributionArn = `arn:aws:cloudfront::${this.account}:distribution/${this.cloudfrontDistributionId}`;
    this.invalidateCloudfrontCodeBuildProject.addToRolePolicy(
      new iam.PolicyStatement({
        resources: [distributionArn],
        actions: ['cloudfront:CreateInvalidation'],
      })
    );
  }
}
