import { Tags } from 'aws-cdk-lib';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { SiteCertificateProps, SiteCertificateStackResources } from '../../../../../lib/types';
import { SiteStack } from '../site/SiteStack';
import { SOM_TAG_NAME } from '../../../../../lib/consts';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { _id } from '../../../../../lib/utils';

export async function build(siteStack: SiteStack, props: SiteCertificateProps): Promise<SiteCertificateStackResources> {
  // ----------------------------------------------------------------------
  // Retrieve HostedZone
  const hostedZone = (() => {
    if (siteStack.hostedZoneResources.hostedZone) {
      return siteStack.hostedZoneResources.hostedZone;
    }

    return route53.HostedZone.fromHostedZoneAttributes(siteStack, _id('HostedZone', props.domainName, true), {
      zoneName: props.domainName,
      hostedZoneId: props.hostedZoneId,
    });
  })();

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
      const subdomainCertificate = new certificatemanager.DnsValidatedCertificate(
        siteStack,
        `DomainCertificate-${subdomain.domainName}`,
        {
          domainName: subdomain.domainName,
          subjectAlternativeNames: [`*.${subdomain.domainName}`],
          hostedZone: hostedZone,
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

export async function buildManualValidation(
  siteStack: SiteStack,
  props: SiteCertificateProps
): Promise<SiteCertificateStackResources> {
  // ----------------------------------------------------------------------
  // SSL certificate for apex and wildcard subdomains
  const domainCertificate = new certificatemanager.Certificate(siteStack, 'DomainCertificate', {
    domainName: siteStack.siteProps.rootDomain,
    subjectAlternativeNames: [`*.${siteStack.siteProps.rootDomain}`],
  });
  Tags.of(domainCertificate).add(SOM_TAG_NAME, siteStack.somId);

  // ----------------------------------------------------------------------
  // SSL certificates for subdomains
  if (siteStack.siteProps.subdomains && siteStack.siteProps.contextParams.deploySubdomainCerts) {
    siteStack.siteProps.subdomains.forEach((subdomain) => {
      const subdomainCertificate = new certificatemanager.Certificate(
        siteStack,
        `DomainCertificate-${subdomain.domainName}`,
        {
          domainName: subdomain.domainName,
          subjectAlternativeNames: [`*.${subdomain.domainName}`],
        }
      );
      Tags.of(subdomainCertificate).add(SOM_TAG_NAME, siteStack.somId);
    });
  }

  return {
    domainCertificate,
  };
}
