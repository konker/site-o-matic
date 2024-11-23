import { AcmCertificate } from '@cdktf/provider-aws/lib/acm-certificate';
import { AcmCertificateValidation } from '@cdktf/provider-aws/lib/acm-certificate-validation';
import { Route53Record } from '@cdktf/provider-aws/lib/route53-record';
import { SsmParameter } from '@cdktf/provider-aws/lib/ssm-parameter';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import { SSM_PARAM_NAME_DOMAIN_CERTIFICATE_ARN } from '../../../../../lib/consts';
import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import { _somTags } from '../../../../../lib/utils';
import type { SiteStack } from '../SiteStack';

// ----------------------------------------------------------------------
export type CertificateResources = {
  readonly domainName: string;
  readonly certificate: AcmCertificate;
  readonly validationDnsRecord: Route53Record;
  readonly certificateValidation: AcmCertificateValidation;
  readonly ssmParams: Array<SsmParameter>;
};

// ----------------------------------------------------------------------
export async function build(
  siteStack: SiteStack,
  webHostingSpec: WebHostingClauseWithResources,
  localIdPostfix: string
): Promise<CertificateResources> {
  if (!siteStack.hostedZoneResources?.hostedZone) {
    throw new Error('[site-o-matic] Could not build certificate resources when hostedZone is missing');
  }

  // ----------------------------------------------------------------------
  // SSL certificate for apex and wildcard subdomains
  const certificate = new AcmCertificate(siteStack, `DomainCertificate-${localIdPostfix}`, {
    domainName: webHostingSpec.domainName,
    subjectAlternativeNames: [`*.${webHostingSpec.domainName}`],
    validationMethod: 'DNS',
    lifecycle: {
      createBeforeDestroy: true,
    },
    provider: siteStack.providerCertificateRegion,
    tags: _somTags(siteStack),
  });

  const validationDnsRecord = new Route53Record(siteStack, `DomainCertificateValidationDnsRecord-${localIdPostfix}`, {
    name: certificate.domainValidationOptions.get(0).resourceRecordName,
    type: certificate.domainValidationOptions.get(0).resourceRecordType,
    records: [certificate.domainValidationOptions.get(0).resourceRecordValue],
    zoneId: siteStack.hostedZoneResources.hostedZone.zoneId,
    ttl: 60,
    provider: siteStack.providerCertificateRegion,
  });

  const certificateValidation = new AcmCertificateValidation(
    siteStack,
    `DomainCertificateValidation-${localIdPostfix}`,
    {
      certificateArn: certificate.arn,
      validationRecordFqdns: [validationDnsRecord.fqdn],
      provider: siteStack.providerCertificateRegion,
    }
  );

  // ----------------------------------------------------------------------
  // SSM Params
  const ssm1 = new SsmParameter(siteStack, `SsmDomainCertificateArn-${localIdPostfix}`, {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_DOMAIN_CERTIFICATE_ARN,
      webHostingSpec.domainName
    ),
    value: certificate.arn,
    provider: siteStack.providerControlPlaneRegion,
    tags: _somTags(siteStack),
  });

  return {
    domainName: webHostingSpec.domainName,
    certificate,
    validationDnsRecord,
    certificateValidation,
    ssmParams: [ssm1],
  };
}
