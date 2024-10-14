import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

import { _somMeta } from '../../../../../lib/utils';
import type { SiteResourcesNestedStack } from '../SiteStack/SiteResourcesNestedStack';

// ----------------------------------------------------------------------
export type CloudfrontFunctionsResources = {
  functions: Array<[cloudfront.Function, cloudfront.FunctionEventType]>;
};

// ----------------------------------------------------------------------
export async function build(
  siteResourcesStack: SiteResourcesNestedStack,
  cfFunctionViewerRequestTmpFilePath: [string, string | undefined],
  cfFunctionViewerResponseTmpFilePath: [string, string | undefined]
): Promise<CloudfrontFunctionsResources> {
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build cloudfront functions resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  // Cloudfront functions
  const functions = [
    [...cfFunctionViewerRequestTmpFilePath, cloudfront.FunctionEventType.VIEWER_REQUEST],
    [...cfFunctionViewerResponseTmpFilePath, cloudfront.FunctionEventType.VIEWER_RESPONSE],
  ].reduce(
    (acc, [cfFunctionId, cfFunctionTmpFilePath, cfFunctionEventType]) => {
      if (cfFunctionTmpFilePath) {
        const func = new cloudfront.Function(siteResourcesStack, `CloudFrontFunction-${cfFunctionId}`, {
          comment: `${cfFunctionId} function for ${siteResourcesStack.somId}`,
          code: cloudfront.FunctionCode.fromFile({
            filePath: cfFunctionTmpFilePath,
          }),
        });
        return [...acc, [func, cfFunctionEventType] as [cloudfront.Function, cloudfront.FunctionEventType]];
      }
      return acc;
    },
    [] as Array<[cloudfront.Function, cloudfront.FunctionEventType]>
  );

  functions.forEach(([cfFunction]) => {
    _somMeta(
      siteResourcesStack.siteProps.config,
      cfFunction,
      siteResourcesStack.somId,
      siteResourcesStack.siteProps.locked
    );
  });

  return {
    functions,
  };
}
