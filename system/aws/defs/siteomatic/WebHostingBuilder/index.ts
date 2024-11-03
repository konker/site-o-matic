import { formulateSomId } from '../../../../../lib';
import { WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS, WEB_HOSTING_TYPE_CLOUDFRONT_S3 } from '../../../../../lib/consts';
import type {
  WebHostingClauseWithResources,
  WebHostingType,
} from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { SecretsSetCollection } from '../../../../../lib/secrets/types';
import type { SiteResourcesStack } from '../SiteStack/SiteResourcesStack';
import * as CertificateBuilder from './CertificateBuilder';
import * as HttpsCloudfrontDistributionBuilder from './HttpsCloudfrontDistributionBuilder';
import * as S3CloudfrontDistributionBuilder from './S3CloudfrontDistributionBuilder';
import * as WafBuilder from './WafBuilder';

// ----------------------------------------------------------------------
export type CloudfrontDistributionResources =
  | S3CloudfrontDistributionBuilder.S3CloudfrontDistributionResources
  | HttpsCloudfrontDistributionBuilder.HttpsCloudfrontDistributionResources;

// ----------------------------------------------------------------------
export type WebHostingResources = {
  readonly type: WebHostingType;
  readonly domainName: string;
  readonly certificateResources: CertificateBuilder.CertificateResources;
  readonly cloudfrontDistributionResources: CloudfrontDistributionResources;
};

// ----------------------------------------------------------------------
export async function build(
  siteResourcesStack: SiteResourcesStack,
  secrets: SecretsSetCollection,
  webHostingSpec: WebHostingClauseWithResources
): Promise<WebHostingResources> {
  // TODO: check for actual dependencies, if any
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build web hosting resources when domainUser is missing');
  }

  const localIdPostfix = formulateSomId(siteResourcesStack.siteProps.config, webHostingSpec.domainName);

  // ----------------------------------------------------------------------
  // TLS Certificate
  const certificateResources = await CertificateBuilder.build(siteResourcesStack, webHostingSpec, localIdPostfix);

  // ----------------------------------------------------------------------
  // WAF ACl
  const wafResources = await WafBuilder.build(siteResourcesStack, webHostingSpec);

  const cloudfrontDistributionResources: CloudfrontDistributionResources = await (async () => {
    switch (webHostingSpec.type) {
      case WEB_HOSTING_TYPE_CLOUDFRONT_S3:
        return S3CloudfrontDistributionBuilder.build(
          siteResourcesStack,
          secrets,
          webHostingSpec,
          siteResourcesStack.siteProps.context.manifest.webHostingDefaults[WEB_HOSTING_TYPE_CLOUDFRONT_S3],
          localIdPostfix,
          certificateResources,
          wafResources
        );
      case WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS:
        return HttpsCloudfrontDistributionBuilder.build(
          siteResourcesStack,
          secrets,
          webHostingSpec,
          siteResourcesStack.siteProps.context.manifest.webHostingDefaults[WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS],
          localIdPostfix,
          certificateResources,
          wafResources
        );
    }
  })();

  return {
    type: webHostingSpec.type,
    domainName: webHostingSpec.domainName,
    certificateResources,
    cloudfrontDistributionResources,
  };
}
