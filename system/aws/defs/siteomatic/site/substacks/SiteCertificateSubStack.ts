import * as cdk from 'aws-cdk-lib';

import { DEFAULT_CERTIFICATE_REGION, DEFAULT_STACK_PROPS } from '../../../../../../lib/consts';
import type { SiteNestedStackProps } from '../../../../../../lib/types';
import * as CertificateBuilder from '../../hosting/CertificateBuilder';
import type { SiteStack } from '../SiteStack';

export class SiteCertificateSubStack extends cdk.NestedStack {
  public siteStack: SiteStack;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    super(
      scope,
      `${scope.somId}-nested-certificate`,
      Object.assign({}, DEFAULT_STACK_PROPS(scope.somId, scope.siteProps), props)
    );
    this.siteStack = scope;
    console.log('\t⮡ Created SiteCertificateSubStack');
  }

  async build() {
    if (!this.siteStack?.hostedZoneResources?.hostedZone.hostedZoneId) {
      throw new Error(`[site-o-matic] Could not build certificate sub-stack when hostedZoneId is missing`);
    }

    this.siteStack.certificateResources = await CertificateBuilder.build(this, {
      siteStack: this.siteStack,
      region: DEFAULT_CERTIFICATE_REGION,
      domainName: this.siteStack.siteProps.rootDomainName,
      hostedZoneId: this.siteStack.hostedZoneResources.hostedZone.hostedZoneId,
      subdomains: this.siteStack.siteProps.dns?.subdomains ?? [],
    });
  }
}
