import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { SITE_PIPELINE_TYPE_CODECOMMIT_NPM } from "../../../../../../lib/consts";
import {
  CodecommitNpmSitePipelineResources,
  PipelineBuilderProps,
} from "../../../../../../lib/types";
import * as CodecommitSitePipelineStack from "./BaseCodecommitPipelineBuilder";
import { _somMeta } from "../../../../../../lib/utils";
import { Construct } from "constructs";
import { toSsmParamName } from "../../../../../../lib/aws/ssm";

export async function build(
  scope: Construct,
  props: PipelineBuilderProps
): Promise<CodecommitNpmSitePipelineResources> {
  const parentResources = await CodecommitSitePipelineStack.build(scope, props);

  // ----------------------------------------------------------------------
  const codePipeline = new codepipeline.Pipeline(scope, "CodePipeline", {
    pipelineName: props.siteStack.somId,
  });
  _somMeta(
    codePipeline,
    props.siteStack.somId,
    props.siteStack.siteProps.protected
  );

  // ----------------------------------------------------------------------
  const codeBuildPipelineProject = new codebuild.PipelineProject(
    scope,
    "CodeBuildPipelineProject",
    {
      projectName: props.siteStack.somId,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: ["npm install"],
          },
          build: {
            commands: ["npm run build"],
          },
        },
        artifacts: {
          files: ["**/*"],
        },
      }),
    }
  );
  _somMeta(
    codeBuildPipelineProject,
    props.siteStack.somId,
    props.siteStack.siteProps.protected
  );

  // ----------------------------------------------------------------------
  const sourceOutput = new codepipeline.Artifact("SourceOutput");
  const buildOutput = new codepipeline.Artifact("BuildOutput");

  const sourceAction = new actions.CodeCommitSourceAction({
    actionName: "CodeCommitAction",
    repository: parentResources.codeCommitRepo,
    output: sourceOutput,
    branch: "main",
  });
  const codeBuildAction = new actions.CodeBuildAction({
    actionName: "CodeBuildAction",
    project: codeBuildPipelineProject,
    input: sourceOutput,
    outputs: [buildOutput],
  });
  const deployAction = new actions.S3DeployAction({
    actionName: "S3DeployAction",
    bucket: props.siteStack.hostingResources.domainBucket,
    input: buildOutput,
  });
  const invalidateAction = new actions.CodeBuildAction({
    actionName: "InvalidateCache",
    project: parentResources.invalidateCloudfrontCodeBuildProject,
    input: buildOutput,
  });

  // ----------------------------------------------------------------------
  codePipeline.addStage({
    stageName: "Source",
    actions: [sourceAction],
  });
  codePipeline.addStage({
    stageName: "Build",
    actions: [codeBuildAction],
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
  const res1 = new ssm.StringParameter(scope, "SsmCodePipelineArn", {
    parameterName: toSsmParamName(props.siteStack.somId, "code-pipeline-arn"),
    stringValue: codePipeline.pipelineArn,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res1, props.siteStack.somId, props.siteStack.siteProps.protected);

  return {
    type: SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
    ...parentResources,
    codePipeline,
  };
}
