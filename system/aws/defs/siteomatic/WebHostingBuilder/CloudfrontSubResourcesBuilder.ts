import { CloudfrontCachePolicy } from '@cdktf/provider-aws/lib/cloudfront-cache-policy';
import { CloudfrontOriginRequestPolicy } from '@cdktf/provider-aws/lib/cloudfront-origin-request-policy';
import { CloudfrontResponseHeadersPolicy } from '@cdktf/provider-aws/lib/cloudfront-response-headers-policy';
import { DataAwsCloudfrontOriginRequestPolicy } from '@cdktf/provider-aws/lib/data-aws-cloudfront-origin-request-policy';

import { ONE_DAY_IN_SECS } from '../../../../../lib/consts';
import type { SiteStack } from '../SiteStack';

// ----------------------------------------------------------------------
export type CloudfrontSubResources = {
  readonly responseHeadersPolicy: CloudfrontResponseHeadersPolicy;
  readonly cachePolicy: CloudfrontCachePolicy;
  readonly originRequestPolicyS3: CloudfrontOriginRequestPolicy;
  readonly originRequestPolicyHttps: DataAwsCloudfrontOriginRequestPolicy;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteStack, localIdPostfix: string): Promise<CloudfrontSubResources> {
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build response headers resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  const responseHeadersPolicy = new CloudfrontResponseHeadersPolicy(
    siteResourcesStack,
    `SecurityHeadersResponseHeaderPolicy-${localIdPostfix}`,
    {
      name: 'SSS',
      securityHeadersConfig: {
        contentSecurityPolicy: {
          override: true,
          contentSecurityPolicy: "default-src 'self'",
        },
        strictTransportSecurity: {
          override: true,
          accessControlMaxAgeSec: ONE_DAY_IN_SECS * 365,
          includeSubdomains: true,
          preload: true,
        },
        contentTypeOptions: {
          override: true,
        },
        referrerPolicy: {
          override: true,
          referrerPolicy: 'strict-origin-when-cross-origin',
        },
        xssProtection: {
          override: true,
          protection: true,
          modeBlock: true,
        },
        frameOptions: {
          override: true,
          frameOption: 'DENY',
        },
      },
      provider: siteResourcesStack.providerManifestRegion,
    }
  );

  // ----------------------------------------------------------------------
  const cachePolicy = new CloudfrontCachePolicy(
    siteResourcesStack,
    `CloudFrontDistributionCachePolicy-${localIdPostfix}`,
    {
      name: `CloudFrontDistributionCachePolicy-${localIdPostfix}`,
      parametersInCacheKeyAndForwardedToOrigin: {
        queryStringsConfig: {
          queryStringBehavior: 'none',
        },
        cookiesConfig: {
          cookieBehavior: 'none',
        },
        headersConfig: {
          headerBehavior: 'none',
        },
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      },
      provider: siteResourcesStack.providerManifestRegion,
    }
  );

  // ----------------------------------------------------------------------
  const originRequestPolicyS3 = new CloudfrontOriginRequestPolicy(
    siteResourcesStack,
    `OriginRequestPolicyS3-${localIdPostfix}`,
    {
      name: `OriginRequestPolicy-${localIdPostfix}`,
      headersConfig: {
        headerBehavior: 'allViewer',
      },
      queryStringsConfig: {
        queryStringBehavior: 'none',
      },
      cookiesConfig: {
        cookieBehavior: 'none',
      },
      provider: siteResourcesStack.providerManifestRegion,
    }
  );

  // ----------------------------------------------------------------------
  // Load magic ALL_VIEWER_EXCEPT_HOST_HEADER policy
  // See: https://github.com/aws/aws-cdk/tree/main/packages/aws-cdk-lib/aws-cloudfront/lib/origin-request-policy.ts
  const originRequestPolicyHttps = new DataAwsCloudfrontOriginRequestPolicy(
    siteResourcesStack,
    `OriginRequestPolicyHttps-${localIdPostfix}`,
    {
      id: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
      provider: siteResourcesStack.providerManifestRegion,
    }
  );

  return {
    responseHeadersPolicy,
    cachePolicy,
    originRequestPolicyS3,
    originRequestPolicyHttps,
  };
}
