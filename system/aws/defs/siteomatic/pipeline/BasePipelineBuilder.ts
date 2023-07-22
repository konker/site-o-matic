import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

import type { BaseSitePipelineResources, PipelineBuilderProps } from '../../../../../lib/types';
import { _somMeta } from '../../../../../lib/utils';

export function build(scope: Construct, props: PipelineBuilderProps): BaseSitePipelineResources {
  if (!props.siteStack.hostingResources) {
    throw new Error(`[site-o-matic] Could not build pipeline sub-stack when hostingResources is missing`);
  }

  // ----------------------------------------------------------------------
  // CodeBuild project for invalidating the cloudfront cache
  const invalidateCloudfrontCodeBuildProject = new codebuild.PipelineProject(scope, `InvalidateCloudfront`, {
    buildSpec: codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        build: {
          commands: ['aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_ID} --paths "/*"'],
        },
      },
    }),
    environmentVariables: {
      CLOUDFRONT_ID: {
        value: props.siteStack.hostingResources.cloudFrontDistribution.distributionId,
      },
    },
  });
  _somMeta(invalidateCloudfrontCodeBuildProject, props.siteStack.somId, props.siteStack.siteProps.protected);

  // Add Cloudfront invalidation permissions to the project
  const distributionArn = `arn:aws:cloudfront::${props.siteStack.account}:distribution/${props.siteStack.hostingResources.cloudFrontDistribution.distributionId}`;
  invalidateCloudfrontCodeBuildProject.addToRolePolicy(
    new iam.PolicyStatement({
      resources: [distributionArn],
      actions: ['cloudfront:CreateInvalidation'],
    })
  );

  return {
    invalidateCloudfrontCodeBuildProject,
  };
}
