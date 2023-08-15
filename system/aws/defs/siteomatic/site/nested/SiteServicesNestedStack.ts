import * as cdk from 'aws-cdk-lib';

import { DEFAULT_STACK_PROPS, SERVICE_TYPE_REST_API } from '../../../../../../lib/consts';
import type { SiteNestedStackProps } from '../../../../../../lib/types';
import * as RestApiServiceBuilder from '../../hosting/RestApiServiceBuilder';
import type { SiteStack } from '../SiteStack';

export class SiteServicesNestedStack extends cdk.NestedStack {
  public siteStack: SiteStack;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    super(
      scope,
      `${scope.somId}-nested-services`,
      Object.assign({}, DEFAULT_STACK_PROPS(scope.config, scope.somId, scope.siteProps), props)
    );
    this.siteStack = scope;
    console.log('\t⮡ Created SiteServicesNestedStack');
  }

  async build() {
    if (!this.siteStack?.certificateResources?.domainCertificate) {
      throw new Error(`[site-o-matic] Could not build services sub-stack when domainCertificate is missing`);
    }

    for (const serviceSpec of this.siteStack.siteProps.context.manifest.services ?? []) {
      switch (serviceSpec.type) {
        case SERVICE_TYPE_REST_API: {
          const serviceResources = await RestApiServiceBuilder.build(this, this.siteStack.config, {
            siteStack: this.siteStack,
            service: serviceSpec,
          });
          this.siteStack.servicesResources?.push(serviceResources);
          console.log(`\t\t⮡ Created service resources for: ${serviceSpec.domainName}`);
          break;
        }
        default: {
          throw new Error(`[site-o-matic] Unknown service type: ${serviceSpec.type}`);
        }
      }
    }
  }
}
