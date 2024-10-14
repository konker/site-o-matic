// ----------------------------------------------------------------------
import {
  WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
} from '../../../../../lib/consts';
import { getFunctionProducer } from '../../../../../lib/edge';
import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { SiteResourcesNestedStack } from '../SiteStack/SiteResourcesNestedStack';

export type CloudfrontFunctionsLoaderResources = {
  readonly cfFunctionViewerRequestTmpFilePath: string | undefined;
  readonly cfFunctionViewerResponseTmpFilePath: string | undefined;
};

// ----------------------------------------------------------------------
export async function load(
  siteResourcesStack: SiteResourcesNestedStack,
  webHostingSpec: WebHostingClauseWithResources
): Promise<CloudfrontFunctionsLoaderResources> {
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build cloudfront functions resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  // Viewer Request cfFunction
  const cfFunctionViewerRequestSubComponentIds = [WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID].concat(
    'redirect' in webHostingSpec && webHostingSpec.redirect
      ? [WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID]
      : []
  );

  const viewerRequestFunctionProducer = getFunctionProducer(
    WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
    cfFunctionViewerRequestSubComponentIds,
    siteResourcesStack.siteProps.context.somId,
    siteResourcesStack.siteProps.context.manifest,
    webHostingSpec
  );
  if (!viewerRequestFunctionProducer) throw new Error(`Could not get functionProducer for Cloudfront viewer request`);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const cfFunctionViewerRequestTmpFilePath = await viewerRequestFunctionProducer();

  // ----------------------------------------------------------------------
  // Viewer Response cfFunction
  const viewerResponseFunctionProducer = getFunctionProducer(
    WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
    [],
    siteResourcesStack.siteProps.context.somId,
    siteResourcesStack.siteProps.context.manifest,
    webHostingSpec
  );
  if (!viewerResponseFunctionProducer) throw new Error(`Could not get functionProducer for Cloudfront viewer response`);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const cfFunctionViewerResponseTmpFilePath = await viewerResponseFunctionProducer();

  return {
    cfFunctionViewerRequestTmpFilePath,
    cfFunctionViewerResponseTmpFilePath,
  };
}
