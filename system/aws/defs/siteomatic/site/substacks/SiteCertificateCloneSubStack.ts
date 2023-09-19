import * as cdk from 'aws-cdk-lib';

import { DEFAULT_STACK_PROPS } from '../../../../../../lib/consts';
import * as CertificateBuilder from '../../hosting/CertificateBuilder';
import type { SiteStack } from '../SiteStack';

// NOTE: This is _not_ a NestedStack
export class SiteCertificateCloneSubStack extends cdk.Stack {
  readonly siteStack: SiteStack;
  readonly props: cdk.StackProps;

  constructor(scope: SiteStack, props: cdk.StackProps) {
    if (!props.env?.account) {
      throw new Error(`[CertificateCloneStack] No account given`);
    }
    if (!props.env?.region) {
      throw new Error(`[CertificateCloneStack] No region given`);
    }

    const stackId = `${scope.somId}-certificate-clones-substack-${props.env.account}-${props.env.region}`;
    super(scope, stackId, Object.assign({}, DEFAULT_STACK_PROPS(scope.config, scope.somId, scope.siteProps), props));

    this.siteStack = scope;
    this.props = props;

    console.log(`⮡ Created SiteCertificateCloneSubStack: [${stackId}]`);
  }

  async build() {
    const hostedZoneId = this.siteStack?.hostedZoneResources?.hostedZone?.hostedZoneId;
    if (!hostedZoneId) {
      throw new Error(`[CertificateCloneStack] Could not find hostedZoneId`);
    }

    // ----------------------------------------------------------------------
    // SSL Certificates
    await CertificateBuilder.build(
      this,
      this.siteStack.config,
      {
        siteStack: this.siteStack,
        rootDomainName: this.siteStack.siteProps.context.rootDomainName,
        hostedZoneId: hostedZoneId,
      },
      this.siteStack.siteProps.context.manifest.dns
    );
  }
}
