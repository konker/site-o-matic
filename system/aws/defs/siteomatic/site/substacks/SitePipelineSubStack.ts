import * as cdk from "aws-cdk-lib";
import { SiteNestedStackProps } from "../../../../../../lib/types";
import {
  DEFAULT_STACK_PROPS,
  SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
} from "../../../../../../lib/consts";
import * as CodecommitS3SitePipelineBuilder from "../../pipeline/codecommit/CodecommitS3PipelineBuilder";
import * as CodecommitNpmSitePipelineBuilder from "../../pipeline/codecommit/CodecommitNpmPipelineBuilder";
import type { SiteStack } from "../SiteStack";

export class SitePipelineSubStack extends cdk.NestedStack {
  public siteStack: SiteStack;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    super(
      scope,
      `${scope.somId}-nested-pipeline-nested`,
      Object.assign(
        {},
        DEFAULT_STACK_PROPS(scope.somId, scope.siteProps),
        props
      )
    );
    this.siteStack = scope;
    console.log("\t⮡ Created SitePipelineSubStack");
  }

  async build() {
    switch (this.siteStack.siteProps.pipelineType) {
      case SITE_PIPELINE_TYPE_CODECOMMIT_S3: {
        this.siteStack.sitePipelineResources =
          await CodecommitS3SitePipelineBuilder.build(this, {
            siteStack: this.siteStack,
            pipelineType: SITE_PIPELINE_TYPE_CODECOMMIT_S3,
          });
        break;
      }
      case SITE_PIPELINE_TYPE_CODECOMMIT_NPM: {
        this.siteStack.sitePipelineResources =
          await CodecommitNpmSitePipelineBuilder.build(this, {
            siteStack: this.siteStack,
            pipelineType: SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
          });
        break;
      }
      default:
        throw new Error(
          `Could not create pipeline of type: ${this.siteStack.siteProps.pipelineType}`
        );
    }
  }
}
