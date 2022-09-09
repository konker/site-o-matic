import * as cdk from 'aws-cdk-lib';

import { DEFAULT_STACK_PROPS } from '../../../../../../lib/consts';
import type { SiteNestedStackProps } from '../../../../../../lib/types';
import * as CertificateBuilder from '../../hosting/CertificateBuilder';
import type { SiteStack } from '../SiteStack';

export class SiteCertificateCloneSubStack extends cdk.NestedStack {
  public siteStack: SiteStack;
  public props: SiteNestedStackProps;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    if (!props.env?.account) {
      throw new Error(`[CertificateCloneStack] No account given`);
    }
    if (!props.env?.region) {
      throw new Error(`[CertificateCloneStack] No region given`);
    }

    super(
      scope,
      `${scope.somId}-certificate-clones-nested-${props.env.account}-${props.env.region}`,
      Object.assign({}, DEFAULT_STACK_PROPS(scope.somId, scope.siteProps), props)
    );
    this.siteStack = scope;
    this.props = Object.assign({}, DEFAULT_STACK_PROPS(scope.somId, scope.siteProps), props);

    console.log(`\t⮡ Created SiteCertificateCloneSubStack: ${props.env.account} / ${props.env.region}`);
  }

  async build() {
    if (!this.props.env?.region) {
      throw new Error(`[CertificateCloneStack] No region given`);
    }

    const hostedZoneId = this.siteStack?.hostedZoneResources?.hostedZone?.hostedZoneId;
    if (!hostedZoneId) {
      throw new Error(`[CertificateCloneStack] Could not find hostedZoneId`);
    }

    // ----------------------------------------------------------------------
    // SSL Certificates
    await CertificateBuilder.buildManualValidation(this, {
      siteStack: this.siteStack,
      region: this.props.env.region,
      domainName: this.siteStack.siteProps.dns.domainName,
      hostedZoneId: hostedZoneId,
      subdomains: this.siteStack.siteProps.dns.subdomains ?? [],
    });
  }
}
