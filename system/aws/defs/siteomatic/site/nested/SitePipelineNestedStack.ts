import assert from 'assert';
import * as cdk from 'aws-cdk-lib';
import * as notifications from 'aws-cdk-lib/aws-codestarnotifications';

import {
  DEFAULT_STACK_PROPS,
  SITE_PIPELINE_TYPE_CODESTAR_CUSTOM,
  SITE_PIPELINE_TYPE_CODESTAR_S3,
} from '../../../../../../lib/consts';
import type { SiteNestedStackProps } from '../../../../../../lib/types';
import { _somMeta } from '../../../../../../lib/utils';
import * as CodeStarCustomSitePipelineBuilder from '../../pipeline/codestar/CodeStarCustomPipelineBuilder';
import * as CodeStarS3SitePipelineBuilder from '../../pipeline/codestar/CodeStarS3PipelineBuilder';
import type { SiteStack } from '../SiteStack';

export class SitePipelineNestedStack extends cdk.NestedStack {
  public siteStack: SiteStack;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    super(
      scope,
      `${scope.somId}-nested-pipeline-nested`,
      Object.assign({}, DEFAULT_STACK_PROPS(scope.config, scope.somId, scope.siteProps), props)
    );
    this.siteStack = scope;
    console.log('\t⮡ Created SitePipelineNestedStack');
  }

  async build() {
    const pipelineType = this.siteStack.siteProps.context.manifest.pipeline?.type;
    switch (pipelineType) {
      case SITE_PIPELINE_TYPE_CODESTAR_S3: {
        this.siteStack.sitePipelineResources = await CodeStarS3SitePipelineBuilder.build(this, this.siteStack.config, {
          siteStack: this.siteStack,
          pipelineType: SITE_PIPELINE_TYPE_CODESTAR_S3,
        });
        break;
      }
      case SITE_PIPELINE_TYPE_CODESTAR_CUSTOM: {
        this.siteStack.sitePipelineResources = await CodeStarCustomSitePipelineBuilder.build(
          this,
          this.siteStack.config,
          {
            siteStack: this.siteStack,
            pipelineType: SITE_PIPELINE_TYPE_CODESTAR_CUSTOM,
          }
        );
        break;
      }
      default:
        throw new Error(`Could not create pipeline of type: ${pipelineType}`);
    }

    // ----------------------------------------------------------------------
    // Send CodePipeline events to SNS
    assert(this.siteStack.notificationsSnsTopic, '[SitePipelineSiteStack] No SNS Topic');

    const rule = new notifications.NotificationRule(this, 'PipelineNotificationRule', {
      source: this.siteStack.sitePipelineResources.codePipeline,
      targets: [this.siteStack.notificationsSnsTopic],
      events: ['codepipeline-pipeline-pipeline-execution-failed', 'codepipeline-pipeline-pipeline-execution-succeeded'],
    });
    _somMeta(this.siteStack.config, rule, this.siteStack.somId, this.siteStack.siteProps.protected);
  }
}
