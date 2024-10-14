import { Duration } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

import { _somMeta } from '../../../../../lib/utils';
import type { SiteResourcesNestedStack } from '../SiteStack/SiteResourcesNestedStack';

// ----------------------------------------------------------------------
export type ResponseHeadersResources = {
  readonly responseHeadersPolicy: cloudfront.ResponseHeadersPolicy;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesNestedStack): Promise<ResponseHeadersResources> {
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build response headers resources when domainUser is missing');
  }

  const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
    siteResourcesStack,
    'SecurityHeadersResponseHeaderPolicy',
    {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          override: true,
          contentSecurityPolicy: "default-src 'self'",
        },
        strictTransportSecurity: {
          override: true,
          accessControlMaxAge: Duration.days(2 * 365),
          includeSubdomains: true,
          preload: true,
        },
        contentTypeOptions: {
          override: true,
        },
        referrerPolicy: {
          override: true,
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
        },
        xssProtection: {
          override: true,
          protection: true,
          modeBlock: true,
        },
        frameOptions: {
          override: true,
          frameOption: cloudfront.HeadersFrameOption.DENY,
        },
      },
    }
  );
  _somMeta(
    siteResourcesStack.siteProps.config,
    responseHeadersPolicy,
    siteResourcesStack.somId,
    siteResourcesStack.siteProps.locked
  );

  return {
    responseHeadersPolicy,
  };
}
