import * as cdk from 'aws-cdk-lib';

import {
  DEFAULT_STACK_PROPS,
  SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM,
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
  SITE_PIPELINE_TYPE_CODESTAR_CUSTOM,
  SITE_PIPELINE_TYPE_CODESTAR_S3,
} from '../../../../../../lib/consts';
import type { SiteNestedStackProps } from '../../../../../../lib/types';
import * as CodeCommitCustomSitePipelineBuilder from '../../pipeline/codecommit/CodeCommitCustomPipelineBuilder';
import * as CodeCommitS3SitePipelineBuilder from '../../pipeline/codecommit/CodeCommitS3PipelineBuilder';
import * as CodeStarCustomSitePipelineBuilder from '../../pipeline/codestar/CodeStarCustomPipelineBuilder';
import * as CodeStarS3SitePipelineBuilder from '../../pipeline/codestar/CodeStarS3PipelineBuilder';
import type { SiteStack } from '../SiteStack';

export class SitePipelineSubStack extends cdk.NestedStack {
  public siteStack: SiteStack;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    super(
      scope,
      `${scope.somId}-nested-pipeline-nested`,
      Object.assign({}, DEFAULT_STACK_PROPS(scope.somId, scope.siteProps), props)
    );
    this.siteStack = scope;
    console.log('\t⮡ Created SitePipelineSubStack');
  }

  async build() {
    const pipelineType = this.siteStack.siteProps.pipeline?.type;
    switch (pipelineType) {
      case SITE_PIPELINE_TYPE_CODECOMMIT_S3: {
        this.siteStack.sitePipelineResources = await CodeCommitS3SitePipelineBuilder.build(this, {
          siteStack: this.siteStack,
          pipelineType: SITE_PIPELINE_TYPE_CODECOMMIT_S3,
        });
        break;
      }
      case SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM: {
        this.siteStack.sitePipelineResources = await CodeCommitCustomSitePipelineBuilder.build(this, {
          siteStack: this.siteStack,
          pipelineType: SITE_PIPELINE_TYPE_CODECOMMIT_CUSTOM,
        });
        break;
      }
      case SITE_PIPELINE_TYPE_CODESTAR_S3: {
        this.siteStack.sitePipelineResources = await CodeStarS3SitePipelineBuilder.build(this, {
          siteStack: this.siteStack,
          pipelineType: SITE_PIPELINE_TYPE_CODESTAR_S3,
        });
        break;
      }
      case SITE_PIPELINE_TYPE_CODESTAR_CUSTOM: {
        this.siteStack.sitePipelineResources = await CodeStarCustomSitePipelineBuilder.build(this, {
          siteStack: this.siteStack,
          pipelineType: SITE_PIPELINE_TYPE_CODESTAR_CUSTOM,
        });
        break;
      }
      default:
        throw new Error(`Could not create pipeline of type: ${pipelineType}`);
    }
  }
}
