import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import {
  SiteCertificateProps,
  SiteCertificateStackResources,
} from "../../../../../lib/types";
import { SiteStack } from "../site/SiteStack";
import * as route53 from "aws-cdk-lib/aws-route53";
import { _id, _somMeta, _somTag } from "../../../../../lib/utils";

export async function build(
  siteStack: SiteStack,
  props: SiteCertificateProps
): Promise<SiteCertificateStackResources> {
  // ----------------------------------------------------------------------
  // Retrieve HostedZone
  const hostedZone = (() => {
    if (siteStack.hostedZoneResources.hostedZone) {
      return siteStack.hostedZoneResources.hostedZone;
    }

    return route53.HostedZone.fromHostedZoneAttributes(
      siteStack,
      _id("HostedZone", props.domainName, true),
      {
        zoneName: props.domainName,
        hostedZoneId: props.hostedZoneId,
      }
    );
  })();

  // ----------------------------------------------------------------------
  // SSL certificate for apex and wildcard subdomains
  const domainCertificate = new certificatemanager.DnsValidatedCertificate(
    siteStack,
    "DomainCertificate",
    {
      domainName: siteStack.siteProps.rootDomain,
      subjectAlternativeNames: [`*.${siteStack.siteProps.rootDomain}`],
      hostedZone: hostedZone,
      region: props.region,
    }
  );
  _somTag(domainCertificate, siteStack.somId);
  // Setting removalPolicy does not work: https://github.com/aws/aws-cdk/issues/20649
  // _somMeta(domainCertificate, siteStack.somId, siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // SSL certificates for subdomains
  if (
    siteStack.siteProps.subdomains &&
    siteStack.siteProps.contextParams.deploySubdomainCerts
  ) {
    siteStack.siteProps.subdomains.forEach((subdomain) => {
      const subdomainCertificate =
        new certificatemanager.DnsValidatedCertificate(
          siteStack,
          `DomainCertificate-${subdomain.domainName}`,
          {
            domainName: subdomain.domainName,
            subjectAlternativeNames: [`*.${subdomain.domainName}`],
            hostedZone: hostedZone,
            region: props.region,
          }
        );
      _somTag(subdomainCertificate, siteStack.somId);
      // Setting removalPolicy does not work: https://github.com/aws/aws-cdk/issues/20649
      // _somMeta(subdomainCertificate, siteStack.somId, siteStack.siteProps.protected);
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
  const domainCertificate = new certificatemanager.Certificate(
    siteStack,
    "DomainCertificate",
    {
      domainName: siteStack.siteProps.rootDomain,
      subjectAlternativeNames: [`*.${siteStack.siteProps.rootDomain}`],
    }
  );
  _somMeta(domainCertificate, siteStack.somId, siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // SSL certificates for subdomains
  if (
    siteStack.siteProps.subdomains &&
    siteStack.siteProps.contextParams.deploySubdomainCerts
  ) {
    siteStack.siteProps.subdomains.forEach((subdomain) => {
      const subdomainCertificate = new certificatemanager.Certificate(
        siteStack,
        `DomainCertificate-${subdomain.domainName}`,
        {
          domainName: subdomain.domainName,
          subjectAlternativeNames: [`*.${subdomain.domainName}`],
        }
      );
      _somMeta(
        subdomainCertificate,
        siteStack.somId,
        siteStack.siteProps.protected
      );
    });
  }

  return {
    domainCertificate,
  };
}
