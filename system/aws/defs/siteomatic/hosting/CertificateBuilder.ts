import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import { formulateSomId } from '../../../../../lib';
import { toSsmParamName } from '../../../../../lib/aws/ssm';
import { SSM_PARAM_NAME_DOMAIN_CERTIFICATE_ARN } from '../../../../../lib/consts';
import type { DnsClause } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { CertificateBuilderProps, CertificateResources, SomConfig } from '../../../../../lib/types';
import { _id, _somMeta, _somTag } from '../../../../../lib/utils';

export async function build(
  scope: Construct,
  config: SomConfig,
  props: CertificateBuilderProps,
  hostedZoneConfig: DnsClause
): Promise<CertificateResources> {
  const isRoot = hostedZoneConfig.domainName === props.rootDomainName;

  // ----------------------------------------------------------------------
  // Retrieve HostedZone
  const hostedZone = (() => {
    if (props.siteStack.hostedZoneResources?.hostedZone) {
      return props.siteStack.hostedZoneResources.hostedZone;
    }
    const hostedZoneId = props.hostedZoneId;

    return route53.HostedZone.fromHostedZoneAttributes(
      scope,
      _id(`HostedZone-${hostedZoneId}`, props.rootDomainName, true),
      {
        zoneName: props.rootDomainName,
        hostedZoneId: hostedZoneId,
      }
    );
  })();

  // ----------------------------------------------------------------------
  // SSL certificate for apex and wildcard subdomains
  const localIdPostfix = formulateSomId(config, hostedZoneConfig.domainName);
  const domainCertificate = new certificatemanager.Certificate(scope, `DomainCertificate-${localIdPostfix}`, {
    domainName: hostedZoneConfig.domainName,
    subjectAlternativeNames: [`*.${hostedZoneConfig.domainName}`],
    validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
  });
  _somTag(config, domainCertificate, props.siteStack.somId);
  // Setting removalPolicy does not work: https://github.com/aws/aws-cdk/issues/20649
  // _somMeta(domainCertificate, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // SSM Params
  if (isRoot) {
    const res1 = new ssm.StringParameter(scope, 'DomainCertificateArn', {
      parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_DOMAIN_CERTIFICATE_ARN),
      stringValue: domainCertificate.certificateArn,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(config, res1, props.siteStack.somId, props.siteStack.siteProps.protected);
  }

  // ----------------------------------------------------------------------
  // SSL certificates for subdomains
  const subdomainResources: Array<CertificateResources> = [];
  if (hostedZoneConfig.subdomains && props.siteStack.siteProps.contextParams.deploySubdomainCerts) {
    // Recurse to create resources for subdomains
    for (const subdomain of hostedZoneConfig.subdomains) {
      const subResources = await build(scope, config, props, subdomain);
      subdomainResources.push(subResources);
    }
  }

  return {
    domainName: hostedZoneConfig.domainName,
    domainCertificate,
    subdomainResources,
  };
}
