import * as cdk from "aws-cdk-lib";
import { SiteNestedStackProps } from "../../../../../../lib/types";
import {
  DEFAULT_CERTIFICATE_REGION,
  DEFAULT_STACK_PROPS,
} from "../../../../../../lib/consts";
import type { SiteStack } from "../SiteStack";
import * as CertificateBuilder from "../../hosting/CertificateBuilder";

export class SiteCertificateSubStack extends cdk.NestedStack {
  public siteStack: SiteStack;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    super(
      scope,
      `${scope.somId}-nested-certificate`,
      Object.assign(
        {},
        DEFAULT_STACK_PROPS(scope.somId, scope.siteProps),
        props
      )
    );
    this.siteStack = scope;
    console.log("\t⮡ Created SiteCertificateSubStack");
  }

  async build() {
    this.siteStack.certificateResources = await CertificateBuilder.build(this, {
      siteStack: this.siteStack,
      region: DEFAULT_CERTIFICATE_REGION,
      domainName: this.siteStack.siteProps.rootDomain,
      hostedZoneId: this.siteStack.hostedZoneResources.hostedZone.hostedZoneId,
      subdomains: this.siteStack.siteProps.subdomains ?? [],
    });
  }
}
