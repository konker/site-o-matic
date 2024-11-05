// ----------------------------------------------------------------------
import {
  WEB_HOSTING_VIEWER_REQUEST_BASIC_AUTH_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
} from '../../../../../lib/consts';
import type { SomFunctionFragmentProducerDef } from '../../../../../lib/edge';
import { getFunctionProducer } from '../../../../../lib/edge';
import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { SecretsSetCollection } from '../../../../../lib/secrets/types';
import type { SiteResourcesStack } from '../SiteStack/SiteResourcesStack';

export type CloudfrontFunctionsLoaderResources = {
  readonly cfFunctionViewerRequestTmpFilePath: string | undefined;
  readonly cfFunctionViewerResponseTmpFilePath: string | undefined;
};

// ----------------------------------------------------------------------
export async function load(
  siteResourcesStack: SiteResourcesStack,
  secrets: SecretsSetCollection,
  webHostingSpec: WebHostingClauseWithResources
): Promise<CloudfrontFunctionsLoaderResources> {
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build cloudfront functions resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  // Viewer Request cfFunction
  const cfFunctionViewerRequestSubComponentIds = ([] as ReadonlyArray<SomFunctionFragmentProducerDef<unknown>>)
    .concat([{ id: WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID, spec: undefined }])
    .concat(
      'redirect' in webHostingSpec && webHostingSpec.redirect
        ? [{ id: WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID, spec: webHostingSpec.redirect }]
        : []
    )
    .concat(
      'auth' in webHostingSpec && webHostingSpec.auth
        ? [{ id: WEB_HOSTING_VIEWER_REQUEST_BASIC_AUTH_FUNCTION_PRODUCER_ID, spec: webHostingSpec.auth }]
        : []
    );

  const viewerRequestFunctionProducer = getFunctionProducer(
    WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
    cfFunctionViewerRequestSubComponentIds,
    siteResourcesStack.siteProps.context.somId,
    secrets,
    siteResourcesStack.siteProps.context.manifest,
    webHostingSpec
  );
  if (!viewerRequestFunctionProducer) throw new Error(`Could not get functionProducer for Cloudfront viewer request`);

  const cfFunctionViewerRequestTmpFilePath = await viewerRequestFunctionProducer();

  // ----------------------------------------------------------------------
  // Viewer Response cfFunction
  const cfFunctionViewerResponseSubComponentIds = [] as ReadonlyArray<SomFunctionFragmentProducerDef<unknown>>;

  const viewerResponseFunctionProducer = getFunctionProducer(
    WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
    cfFunctionViewerResponseSubComponentIds,
    siteResourcesStack.siteProps.context.somId,
    secrets,
    siteResourcesStack.siteProps.context.manifest,
    webHostingSpec
  );
  if (!viewerResponseFunctionProducer) throw new Error(`Could not get functionProducer for Cloudfront viewer response`);

  const cfFunctionViewerResponseTmpFilePath = await viewerResponseFunctionProducer();

  return {
    cfFunctionViewerRequestTmpFilePath,
    cfFunctionViewerResponseTmpFilePath,
  };
}
