import * as cdk from 'aws-cdk-lib';

import { DEFAULT_STACK_PROPS } from '../../../../../../lib/consts';
import type { SiteNestedStackProps } from '../../../../../../lib/types';
import * as HostedZoneBuilder from '../../hostedzone/HostedZoneBuilder';
import type { SiteStack } from '../SiteStack';

export class SiteDnsSubStack extends cdk.NestedStack {
  public siteStack: SiteStack;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    super(
      scope,
      `${scope.somId}-nested-dns`,
      Object.assign({}, DEFAULT_STACK_PROPS(scope.somId, scope.siteProps), props)
    );
    this.siteStack = scope;
    console.log('\t⮡ Created SiteDnsSubStack');
  }

  async build() {
    this.siteStack.hostedZoneResources = await HostedZoneBuilder.build(this, {
      siteStack: this.siteStack,
      domainName: this.siteStack.siteProps.dns.domainName,
      extraDnsConfig: this.siteStack.siteProps.dns.extraDnsConfig ?? [],
      subdomains: this.siteStack.siteProps.dns.subdomains,
    });
  }
}
