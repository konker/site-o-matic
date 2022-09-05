import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import { SitePipelineProps, BaseSitePipelineResources } from '../../../../../lib/types';
import { SiteStack } from '../site/SiteStack';

export async function build(siteStack: SiteStack, props: SitePipelineProps): Promise<BaseSitePipelineResources> {
  // ----------------------------------------------------------------------
  // CodeBuild project for invalidating the cloudfront cache
  const invalidateCloudfrontCodeBuildProject = new codebuild.PipelineProject(siteStack, `InvalidateCloudfront`, {
    buildSpec: codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        build: {
          commands: ['aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_ID} --paths "/*"'],
        },
      },
    }),
    environmentVariables: {
      CLOUDFRONT_ID: { value: siteStack.hostingResources.cloudFrontDistribution.distributionId },
    },
  });

  // Add Cloudfront invalidation permissions to the project
  const distributionArn = `arn:aws:cloudfront::${siteStack.account}:distribution/${siteStack.hostingResources.cloudFrontDistribution.distributionId}`;
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
