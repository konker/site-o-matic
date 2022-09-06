import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { SITE_PIPELINE_TYPE_CODECOMMIT_S3 } from "../../../../../../lib/consts";
import {
  CodecommitS3SitePipelineResources,
  SitePipelineProps,
  toSsmParamName,
} from "../../../../../../lib/types";
import { SiteStack } from "../../site/SiteStack";
import * as CodecommitSitePipelineStack from "./BaseCodecommitSitePipelineBuilder";
import { _somMeta } from "../../../../../../lib/utils";

export async function build(
  siteStack: SiteStack,
  props: SitePipelineProps
): Promise<CodecommitS3SitePipelineResources> {
  const parentResources = await CodecommitSitePipelineStack.build(
    siteStack,
    props
  );

  // ----------------------------------------------------------------------
  // Code Pipeline
  const codePipeline = new codepipeline.Pipeline(siteStack, "CodePipeline", {
    pipelineName: siteStack.somId,
    crossAccountKeys: false,
  });
  _somMeta(codePipeline, siteStack.somId, siteStack.siteProps.protected);

  const sourceOutput = new codepipeline.Artifact();
  const codeCommitAction = new actions.CodeCommitSourceAction({
    actionName: "CodeCommitAction",
    repository: parentResources.codeCommitRepo,
    output: sourceOutput,
    branch: "main",
  });
  const deployAction = new actions.S3DeployAction({
    actionName: "S3DeployAction",
    bucket: siteStack.hostingResources.domainBucket,
    input: sourceOutput,
  });
  const invalidateAction = new actions.CodeBuildAction({
    actionName: "InvalidateCache",
    project: parentResources.invalidateCloudfrontCodeBuildProject,
    input: sourceOutput,
  });

  codePipeline.addStage({
    stageName: "Source",
    actions: [codeCommitAction],
  });
  codePipeline.addStage({
    stageName: "Deploy",
    actions: [deployAction],
  });
  codePipeline.addStage({
    stageName: "Invalidate",
    actions: [invalidateAction],
  });

  // ----------------------------------------------------------------------
  // SSM Params
  const res1 = new ssm.StringParameter(siteStack, "SsmCodePipelineArn", {
    parameterName: toSsmParamName(siteStack.somId, "code-pipeline-arn"),
    stringValue: codePipeline.pipelineArn,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res1, siteStack.somId, siteStack.siteProps.protected);

  return {
    type: SITE_PIPELINE_TYPE_CODECOMMIT_S3,
    ...parentResources,
    codePipeline,
  };
}
