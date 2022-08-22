import { Tags } from '@aws-cdk/core';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';
import { SiteCertificateProps, SiteCertificateStackResources } from '../../../../../lib/types';
import { SiteStack } from '../site/SiteStack';
import { SOM_TAG_NAME } from '../../../../../lib/consts';
import * as route53 from '@aws-cdk/aws-route53';
import { _id } from '../../../../../lib/utils';

export async function build(siteStack: SiteStack, props: SiteCertificateProps): Promise<SiteCertificateStackResources> {
  // ----------------------------------------------------------------------
  // Retrieve HostedZones
  const hostedZone = route53.HostedZone.fromHostedZoneAttributes(siteStack, _id('HostedZone', props.domainName, true), {
    zoneName: props.domainName,
    hostedZoneId: props.hostedZoneId,
  });

  // ----------------------------------------------------------------------
  // SSL certificate for apex and wildcard subdomains
  const domainCertificate = new certificatemanager.DnsValidatedCertificate(siteStack, 'DomainCertificate', {
    domainName: siteStack.siteProps.rootDomain,
    subjectAlternativeNames: [`*.${siteStack.siteProps.rootDomain}`],
    hostedZone: hostedZone,
    region: props.region,
  });
  Tags.of(domainCertificate).add(SOM_TAG_NAME, siteStack.somId);

  // ----------------------------------------------------------------------
  // SSL certificates for subdomains
  if (siteStack.siteProps.subdomains && siteStack.siteProps.contextParams.deploySubdomainCerts) {
    siteStack.siteProps.subdomains.forEach((subdomain) => {
      const subdomainHostedZone = route53.HostedZone.fromHostedZoneAttributes(
        siteStack,
        _id('HostedZone', subdomain.domainName, true),
        {
          zoneName: subdomain.domainName,
          hostedZoneId: props.subdomainHostedZoneIds[subdomain.domainName],
        }
      );

      const subdomainCertificate = new certificatemanager.DnsValidatedCertificate(
        siteStack,
        `DomainCertificate-${subdomain.domainName}`,
        {
          domainName: subdomain.domainName,
          subjectAlternativeNames: [`*.${subdomain.domainName}`],
          hostedZone: subdomainHostedZone,
          region: props.region,
        }
      );
      Tags.of(subdomainCertificate).add(SOM_TAG_NAME, siteStack.somId);
    });
  }

  return {
    domainCertificate,
  };
}
