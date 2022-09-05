import * as route53 from '../../../../../lib/aws/route53';
import { SomConfig } from '../../../../../lib/consts';
import * as SiteCertificateBuilder from '../hosting/SiteCertificateBuilder';
import { SiteStack } from './SiteStack';
import { SiteProps } from '../../../../../lib/types';
import { Construct } from 'constructs';

export class CertificateCloneStack extends SiteStack {
  constructor(scope: Construct, config: SomConfig, somId: string, props: SiteProps) {
    if (!props?.env?.account) {
      throw new Error(`[CertificateCloneStack] No account given`);
    }
    if (!props?.env?.region) {
      throw new Error(`[CertificateCloneStack] No region given`);
    }

    super(scope, config, `${somId}-cert-clone-${props.env.account}-${props.env.region}`, props);
  }

  async build() {
    if (!this.siteProps?.env?.account) {
      throw new Error(`[CertificateCloneStack] No account given`);
    }
    if (!this.siteProps?.env?.region) {
      throw new Error(`[CertificateCloneStack] No region given`);
    }

    const hostedZoneId = await route53.findHostedZoneId(this.config, this.siteProps.rootDomain);
    if (!hostedZoneId) {
      throw new Error(`[CertificateCloneStack] Could not find hostedZoneId`);
    }

    // ----------------------------------------------------------------------
    // SSL Certificates
    this.certificateResources = await SiteCertificateBuilder.buildManualValidation(this, {
      region: this.siteProps.env.region,
      domainName: this.siteProps.rootDomain,
      hostedZoneId: hostedZoneId,
      subdomains: this.siteProps.subdomains ?? [],
    });
  }
}
