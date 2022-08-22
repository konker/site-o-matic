import * as iam from '@aws-cdk/aws-iam';
import * as route53 from '../../../../../lib/aws/route53';
import { DEFAULT_CERTIFICATE_REGION } from '../../../../../lib/consts';
import * as SiteCertificateBuilder from '../hosting/SiteCertificateBuilder';
import { SiteStack } from './SiteStack';
import { HostedZoneConfig } from '../../../../../lib/types';

export class CertificateCloneStack extends SiteStack {
  async build() {
    // ----------------------------------------------------------------------
    // User for all resources
    this.domainUser = iam.User.fromUserName(this, 'DomainUser', this.siteProps.username);
    this.domainGroup = new iam.Group(this, 'DomainGroup', { groupName: `${this.somId}-group` });
    this.domainGroup.addUser(this.domainUser);

    if (!this.siteProps.env?.account) {
      throw new Error(`[CertificateCloneStack] No account given`);
    }
    if (!this.siteProps.env?.region) {
      throw new Error(`[CertificateCloneStack] No region given`);
    }

    const hostedZoneId = await route53.findHostedZoneId(this.config, this.siteProps.rootDomain);
    console.log('KONK80', hostedZoneId);

    const subdomainHostedZoneIds = await Promise.all(
      this.siteProps.subdomains.map(async (i: HostedZoneConfig) => route53.findHostedZoneId(this.config, i.domainName))
    );
    console.log('KONK81', subdomainHostedZoneIds);

    // ----------------------------------------------------------------------
    // SSL Certificates
    /*[FIXME]
    this.certificateResources = await SiteCertificateBuilder.build(this, {
      region: this.siteProps.env.region,
      domainName: this.siteProps.rootDomain,
      hostedZoneId: hostedZoneId,
      subdomains: this.siteProps.subdomains ?? [],
      subdomainHostedZones: this.subdomainHostedZoneResources,
    });
    */
  }
}
