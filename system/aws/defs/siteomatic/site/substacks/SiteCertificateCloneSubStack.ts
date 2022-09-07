import { DEFAULT_STACK_PROPS } from "../../../../../../lib/consts";
import * as CertificateBuilder from "../../hosting/CertificateBuilder";
import { SiteStack } from "../SiteStack";
import { SiteNestedStackProps } from "../../../../../../lib/types";
import * as cdk from "aws-cdk-lib";

export class SiteCertificateCloneSubStack extends cdk.NestedStack {
  public siteStack: SiteStack;

  constructor(scope: SiteStack, props: SiteNestedStackProps) {
    if (!scope.siteProps.env?.account) {
      throw new Error(`[CertificateCloneStack] No account given`);
    }
    if (!scope.siteProps.env?.region) {
      throw new Error(`[CertificateCloneStack] No region given`);
    }

    super(
      scope,
      `${scope.somId}-certificate-clones-nested-${scope.siteProps.env?.account}-${scope.siteProps.env?.region}`,
      Object.assign(
        {},
        DEFAULT_STACK_PROPS(scope.somId, scope.siteProps),
        props
      )
    );
    this.siteStack = scope;
    console.log(
      `\t⮡ Created SiteCertificateCloneSubStack: ${scope.siteProps.env?.account} / ${scope.siteProps.env?.region}`
    );
  }

  async build() {
    if (!this.siteStack.siteProps.env?.region) {
      throw new Error(`[CertificateCloneStack] No region given`);
    }

    const hostedZoneId =
      this.siteStack?.hostedZoneResources?.hostedZone?.hostedZoneId;
    if (!hostedZoneId) {
      throw new Error(`[CertificateCloneStack] Could not find hostedZoneId`);
    }

    // ----------------------------------------------------------------------
    // SSL Certificates
    await CertificateBuilder.buildManualValidation(this, {
      siteStack: this.siteStack,
      region: this.siteStack.siteProps.env.region,
      domainName: this.siteStack.siteProps.rootDomain,
      hostedZoneId: hostedZoneId,
      subdomains: this.siteStack.siteProps.subdomains ?? [],
    });
  }
}
