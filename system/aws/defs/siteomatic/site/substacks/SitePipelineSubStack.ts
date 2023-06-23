import * as cdk from 'aws-cdk-lib';

import {
  DEFAULT_STACK_PROPS,
  SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
  SITE_PIPELINE_TYPE_CODESTAR_NPM,
  SITE_PIPELINE_TYPE_CODESTAR_S3,
} from '../../../../../../lib/consts';
import type { SiteNestedStackProps } from '../../../../../../lib/types';
import * as CodeCommitNpmSitePipelineBuilder from '../../pipeline/codecommit/CodeCommitNpmPipelineBuilder';
import * as CodeCommitS3SitePipelineBuilder from '../../pipeline/codecommit/CodeCommitS3PipelineBuilder';
import * as CodeStarNpmSitePipelineBuilder from '../../pipeline/codestar/CodeStarNpmPipelineBuilder';
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
      case SITE_PIPELINE_TYPE_CODECOMMIT_NPM: {
        this.siteStack.sitePipelineResources = await CodeCommitNpmSitePipelineBuilder.build(this, {
          siteStack: this.siteStack,
          pipelineType: SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
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
      case SITE_PIPELINE_TYPE_CODESTAR_NPM: {
        this.siteStack.sitePipelineResources = await CodeStarNpmSitePipelineBuilder.build(this, {
          siteStack: this.siteStack,
          pipelineType: SITE_PIPELINE_TYPE_CODESTAR_NPM,
        });
        break;
      }
      default:
        throw new Error(`Could not create pipeline of type: ${pipelineType}`);
    }
  }
}
