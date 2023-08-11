import * as cdk from 'aws-cdk-lib';

import { DEFAULT_STACK_PROPS } from '../../../../../../lib/consts';
import type { SiteNestedStackProps } from '../../../../../../lib/types';
import * as HostedZoneBuilder from '../../hostedzone/HostedZoneBuilder';
import type { SiteStack } from '../SiteStack';

export class SiteDnsNestedStack extends cdk.NestedStack {
  public siteStack: SiteStack;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    super(
      scope,
      `${scope.somId}-nested-dns`,
      Object.assign({}, DEFAULT_STACK_PROPS(scope.config, scope.somId, scope.siteProps), props)
    );
    this.siteStack = scope;
    console.log('\t⮡ Created SiteDnsNestedStack');
  }

  async build() {
    this.siteStack.hostedZoneResources = await HostedZoneBuilder.build(
      this,
      this.siteStack.config,
      {
        siteStack: this.siteStack,
        rootDomainName: this.siteStack.siteProps.context.rootDomainName,
      },
      this.siteStack.siteProps.context.manifest.dns
    );
  }
}
