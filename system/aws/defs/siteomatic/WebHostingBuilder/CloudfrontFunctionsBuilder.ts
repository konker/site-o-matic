import { CloudfrontFunction } from '@cdktf/provider-aws/lib/cloudfront-function';
import { AssetType, Fn, TerraformAsset } from 'cdktf';

import { normalizeDomainName } from '../../../../../lib';
import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { SiteStack } from '../SiteStack';

// ----------------------------------------------------------------------
export const CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_REQUEST = 'viewer-request' as const;
export const CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_RESPONSE = 'viewer-response' as const;

export type CloudfrontFunctionEventType =
  | typeof CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_REQUEST
  | typeof CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_RESPONSE;

// ----------------------------------------------------------------------
export type CloudfrontFunctionsResources = {
  functions: Array<[CloudfrontFunction, CloudfrontFunctionEventType]>;
};

// ----------------------------------------------------------------------
export async function build(
  siteStack: SiteStack,
  webHostingSpec: WebHostingClauseWithResources,
  localIdPostfix: string,
  cfFunctionViewerRequestTmpFilePath: [string, string | undefined],
  cfFunctionViewerResponseTmpFilePath: [string, string | undefined]
): Promise<CloudfrontFunctionsResources> {
  if (!siteStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build cloudfront functions resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  // Cloudfront functions
  const functions = [
    [...cfFunctionViewerRequestTmpFilePath, CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_REQUEST],
    [...cfFunctionViewerResponseTmpFilePath, CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_RESPONSE],
  ].reduce(
    (acc, [cfFunctionId, cfFunctionTmpFilePath, cfFunctionEventType]) => {
      if (cfFunctionTmpFilePath) {
        const asset = new TerraformAsset(siteStack, `CloudFrontFunctionCode-${cfFunctionId}-${localIdPostfix}`, {
          path: cfFunctionTmpFilePath,
          type: AssetType.FILE,
        });

        const func = new CloudfrontFunction(siteStack, `CloudFrontFunction-${cfFunctionId}-${localIdPostfix}`, {
          name: `${cfFunctionId}-function-for-${normalizeDomainName(webHostingSpec.domainName, 20)}`,
          runtime: 'cloudfront-js-2.0',
          code: Fn.file(asset.path),
          provider: siteStack.providerManifestRegion,
        });
        return [...acc, [func, cfFunctionEventType] as [CloudfrontFunction, CloudfrontFunctionEventType]];
      }
      return acc;
    },
    [] as Array<[CloudfrontFunction, CloudfrontFunctionEventType]>
  );

  return {
    functions,
  };
}
