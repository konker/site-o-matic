import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

import type { CertificateBuilderProps, CertificateResources, SomConfig } from '../../../../../lib/types';
import { _id, _somMeta, _somTag } from '../../../../../lib/utils';

export async function build(
  scope: Construct,
  config: SomConfig,
  props: CertificateBuilderProps
): Promise<CertificateResources> {
  // ----------------------------------------------------------------------
  // Retrieve HostedZone
  const hostedZone = (() => {
    if (props.siteStack.hostedZoneResources?.hostedZone) {
      return props.siteStack.hostedZoneResources.hostedZone;
    }

    return route53.HostedZone.fromHostedZoneAttributes(scope, _id('HostedZone', props.domainName, true), {
      zoneName: props.domainName,
      hostedZoneId: props.hostedZoneId,
    });
  })();

  // ----------------------------------------------------------------------
  // SSL certificate for apex and wildcard subdomains
  const domainCertificate = new certificatemanager.Certificate(scope, 'DomainCertificate', {
    domainName: props.siteStack.siteProps.context.rootDomainName,
    subjectAlternativeNames: [`*.${props.siteStack.siteProps.context.rootDomainName}`],
    validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
  });
  _somTag(config, domainCertificate, props.siteStack.somId);
  // Setting removalPolicy does not work: https://github.com/aws/aws-cdk/issues/20649
  // _somMeta(domainCertificate, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // SSL certificates for subdomains
  if (
    props.siteStack.siteProps.context.manifest.dns?.subdomains &&
    props.siteStack.siteProps.contextParams.deploySubdomainCerts
  ) {
    props.siteStack.siteProps.context.manifest.dns.subdomains.forEach((subdomain) => {
      const subdomainCertificate = new certificatemanager.Certificate(
        scope,
        `DomainCertificate-${subdomain.domainName}`,
        {
          domainName: subdomain.domainName,
          subjectAlternativeNames: [`*.${subdomain.domainName}`],
          validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
        }
      );
      _somTag(config, subdomainCertificate, props.siteStack.somId);
      // Setting removalPolicy does not work: https://github.com/aws/aws-cdk/issues/20649
      // _somMeta(subdomainCertificate, props.siteStack.somId, props.siteStack.siteProps.protected);
    });
  }

  return {
    domainCertificate,
  };
}

export async function buildManualValidation(
  scope: Construct,
  config: SomConfig,
  props: CertificateBuilderProps
): Promise<CertificateResources> {
  // ----------------------------------------------------------------------
  // SSL certificate for apex and wildcard subdomains
  const domainCertificate = new certificatemanager.Certificate(scope, 'DomainCertificate', {
    domainName: props.siteStack.siteProps.context.rootDomainName,
    subjectAlternativeNames: [`*.${props.siteStack.siteProps.context.rootDomainName}`],
  });
  _somMeta(config, domainCertificate, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // SSL certificates for subdomains
  if (
    props.siteStack.siteProps.context.manifest.dns?.subdomains &&
    props.siteStack.siteProps.contextParams.deploySubdomainCerts
  ) {
    props.siteStack.siteProps.context.manifest.dns.subdomains.forEach((subdomain) => {
      const subdomainCertificate = new certificatemanager.Certificate(
        scope,
        `DomainCertificate-${subdomain.domainName}`,
        {
          domainName: subdomain.domainName,
          subjectAlternativeNames: [`*.${subdomain.domainName}`],
        }
      );
      _somMeta(config, subdomainCertificate, props.siteStack.somId, props.siteStack.siteProps.protected);
    });
  }

  return {
    domainCertificate,
  };
}
