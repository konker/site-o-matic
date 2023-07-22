import * as cdk from 'aws-cdk-lib';

import { DEFAULT_STACK_PROPS } from '../../../../../../lib/consts';
import type { SiteNestedStackProps } from '../../../../../../lib/types';
import * as SiteWebHostingBuilder from '../../hosting/WebHostingBuilder';
import type { SiteStack } from '../SiteStack';

export class SiteWebHostingSubStack extends cdk.NestedStack {
  public siteStack: SiteStack;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    super(
      scope,
      `${scope.somId}-nested-web-hosting`,
      Object.assign({}, DEFAULT_STACK_PROPS(scope.somId, scope.siteProps), props)
    );
    this.siteStack = scope;
    console.log('\t⮡ Created SiteWebHostingSubStack');
  }

  async build() {
    if (!this.siteStack?.certificateResources?.domainCertificate) {
      throw new Error(`[site-o-matic] Could not build web hosting sub-stack when domainCertificate is missing`);
    }

    this.siteStack.hostingResources = await SiteWebHostingBuilder.build(this, {
      siteStack: this.siteStack,
      domainCertificate: this.siteStack.certificateResources.domainCertificate,
      cfFunctionViewerRequestTmpFilePath: this.siteStack.siteProps.cfFunctionViewerRequestTmpFilePath,
      cfFunctionViewerResponseTmpFilePath: this.siteStack.siteProps.cfFunctionViewerResponseTmpFilePath,
    });
  }
}
