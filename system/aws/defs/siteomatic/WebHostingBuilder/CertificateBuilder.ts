import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import { SSM_PARAM_NAME_DOMAIN_CERTIFICATE_ARN } from '../../../../../lib/consts';
import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import { _somMeta, _somTag } from '../../../../../lib/utils';
import type { SiteResourcesStack } from '../SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type CertificateResources = {
  readonly domainName: string;
  readonly certificate: certificatemanager.ICertificate;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(
  siteResourcesStack: SiteResourcesStack,
  webHostingSpec: WebHostingClauseWithResources,
  localIdPostfix: string
): Promise<CertificateResources> {
  // TODO: check for actual dependencies
  if (!siteResourcesStack.hostedZoneResources?.hostedZone) {
    throw new Error('[site-o-matic] Could not build certificate resources when hostedZone is missing');
  }

  // ----------------------------------------------------------------------
  // SSL certificate for apex and wildcard subdomains
  const certificate = new certificatemanager.Certificate(siteResourcesStack, `DomainCertificate-${localIdPostfix}`, {
    domainName: webHostingSpec.domainName,
    subjectAlternativeNames: [`*.${webHostingSpec.domainName}`],
    validation: certificatemanager.CertificateValidation.fromDns(siteResourcesStack.hostedZoneResources.hostedZone),
  });
  _somTag(siteResourcesStack.siteProps.config, certificate, siteResourcesStack.siteProps.context.somId);
  // Setting removalPolicy does not work: https://github.com/aws/aws-cdk/issues/20649
  // _somMeta(domainCertificate, siteStack.somId, siteStack.siteProps.locked);

  // ----------------------------------------------------------------------
  // SSM Params
  const res1 = new ssm.StringParameter(siteResourcesStack, `SsmDomainCertificateArn-${localIdPostfix}`, {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.siteProps.context.somId,
      SSM_PARAM_NAME_DOMAIN_CERTIFICATE_ARN,
      webHostingSpec.domainName
    ),
    stringValue: certificate.certificateArn,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(
    siteResourcesStack.siteProps.config,
    res1,
    siteResourcesStack.siteProps.context.somId,
    siteResourcesStack.siteProps.locked
  );

  return {
    domainName: webHostingSpec.domainName,
    certificate,
    ssmParams: [res1],
  };
}
