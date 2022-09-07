import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import {
  BaseSitePipelineResources,
  PipelineBuilderProps,
} from "../../../../../lib/types";
import { Construct } from "constructs";

export function build(
  scope: Construct,
  props: PipelineBuilderProps
): BaseSitePipelineResources {
  // ----------------------------------------------------------------------
  // CodeBuild project for invalidating the cloudfront cache
  const invalidateCloudfrontCodeBuildProject = new codebuild.PipelineProject(
    scope,
    `InvalidateCloudfront`,
    {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands: [
              'aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_ID} --paths "/*"',
            ],
          },
        },
      }),
      environmentVariables: {
        CLOUDFRONT_ID: {
          value:
            props.siteStack.hostingResources.cloudFrontDistribution
              .distributionId,
        },
      },
    }
  );

  // Add Cloudfront invalidation permissions to the project
  const distributionArn = `arn:aws:cloudfront::${props.siteStack.account}:distribution/${props.siteStack.hostingResources.cloudFrontDistribution.distributionId}`;
  invalidateCloudfrontCodeBuildProject.addToRolePolicy(
    new iam.PolicyStatement({
      resources: [distributionArn],
      actions: ["cloudfront:CreateInvalidation"],
    })
  );

  return {
    invalidateCloudfrontCodeBuildProject,
  };
}
