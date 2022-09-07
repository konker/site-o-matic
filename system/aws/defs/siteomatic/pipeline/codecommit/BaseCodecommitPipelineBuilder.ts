import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as ssm from "aws-cdk-lib/aws-ssm";
import {
  BaseCodecommitSitePipelineResources,
  PipelineBuilderProps,
} from "../../../../../../lib/types";
import * as SitePipelineStack from "../BasePipelineBuilder";
import { Tags } from "aws-cdk-lib";
import { SOM_TAG_NAME } from "../../../../../../lib/consts";
import { toSsmParamName } from "../../../../../../lib/aws/ssm";
import { Construct } from "constructs";

export async function build(
  scope: Construct,
  props: PipelineBuilderProps
): Promise<BaseCodecommitSitePipelineResources> {
  const parentResources = SitePipelineStack.build(scope, props);

  // ----------------------------------------------------------------------
  // CodeCommit git repo
  const codeCommitRepo = new codecommit.Repository(scope, "CodeCommitRepo", {
    repositoryName: props.siteStack.somId,
  });
  Tags.of(codeCommitRepo).add(SOM_TAG_NAME, props.siteStack.somId);

  // Allow access to the domain role
  codeCommitRepo.grantPullPush(props.siteStack.domainUser);

  // ----------------------------------------------------------------------
  // SSM Params
  new ssm.StringParameter(scope, "SsmCodeCommitCloneUrlSsh", {
    parameterName: toSsmParamName(
      props.siteStack.somId,
      "code-commit-clone-url-ssh"
    ),
    stringValue: codeCommitRepo.repositoryCloneUrlSsh,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });

  return {
    ...parentResources,
    codeCommitRepo,
  };
}
