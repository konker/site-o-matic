// ----------------------------------------------------------------------
import {
  WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS,
  WEB_HOSTING_TYPE_CLOUDFRONT_S3,
  WEB_HOSTING_VIEWER_REQUEST_BASIC_AUTH_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_RESPONSE_CSP_HASHES_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
} from '../../../../../lib/consts';
import type { SomFunctionFragmentProducerDef } from '../../../../../lib/edge';
import { getFunctionProducer } from '../../../../../lib/edge';
import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { SecretsSetCollection } from '../../../../../lib/secrets/types';
import type { SiteStack } from '../SiteStack';
import type { CloudfrontFunctionEventType } from './CloudfrontFunctionsBuilder';
import {
  CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_REQUEST,
  CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_RESPONSE,
} from './CloudfrontFunctionsBuilder';

export type CloudfrontFunctionsLoaderResources = {
  readonly cfFunctionViewerRequestTmpFilePath: string | undefined;
  readonly cfFunctionViewerResponseTmpFilePath: string | undefined;
};

// ----------------------------------------------------------------------
export function resolveBaseSubComponentIds(
  cfFunctionEvenType: CloudfrontFunctionEventType,
  webHostingSpec: WebHostingClauseWithResources
): ReadonlyArray<SomFunctionFragmentProducerDef<unknown>> {
  switch (cfFunctionEvenType) {
    case CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_REQUEST:
      switch (webHostingSpec.type) {
        case WEB_HOSTING_TYPE_CLOUDFRONT_S3:
          return [{ id: WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID, spec: undefined }];
        case WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS:
          return [];
      }
      break;
    case CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_RESPONSE:
      switch (webHostingSpec.type) {
        case WEB_HOSTING_TYPE_CLOUDFRONT_S3:
          return [{ id: WEB_HOSTING_VIEWER_RESPONSE_CSP_HASHES_FUNCTION_PRODUCER_ID, spec: undefined }];
        case WEB_HOSTING_TYPE_CLOUDFRONT_HTTPS:
          return [];
      }
      break;
  }
}

// ----------------------------------------------------------------------
export async function load(
  siteStack: SiteStack,
  secrets: SecretsSetCollection,
  webHostingSpec: WebHostingClauseWithResources
): Promise<CloudfrontFunctionsLoaderResources> {
  if (!siteStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build cloudfront functions resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  // Viewer Request cfFunction
  const cfFunctionViewerRequestSubComponentIds = resolveBaseSubComponentIds(
    CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_REQUEST,
    webHostingSpec
  )
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

  const cfFunctionViewerRequestTmpFilePath = await (() => {
    if (cfFunctionViewerRequestSubComponentIds.length === 0) {
      return undefined;
    }

    const viewerRequestFunctionProducer = getFunctionProducer(
      WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
      cfFunctionViewerRequestSubComponentIds,
      siteStack.siteProps.context.somId,
      secrets,
      siteStack.siteProps.context.manifest,
      webHostingSpec
    );
    if (!viewerRequestFunctionProducer) throw new Error(`Could not get functionProducer for Cloudfront viewer request`);

    return viewerRequestFunctionProducer();
  })();

  // ----------------------------------------------------------------------
  // Viewer Response cfFunction
  const cfFunctionViewerResponseSubComponentIds = resolveBaseSubComponentIds(
    CLOUDFRONT_FUNCTION_EVENT_TYPE_VIEWER_RESPONSE,
    webHostingSpec
  );

  const cfFunctionViewerResponseTmpFilePath = await (() => {
    if (cfFunctionViewerResponseSubComponentIds.length === 0) {
      return undefined;
    }

    const viewerResponseFunctionProducer = getFunctionProducer(
      WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
      cfFunctionViewerResponseSubComponentIds,
      siteStack.siteProps.context.somId,
      secrets,
      siteStack.siteProps.context.manifest,
      webHostingSpec
    );
    if (!viewerResponseFunctionProducer)
      throw new Error(`Could not get functionProducer for Cloudfront viewer response`);

    return viewerResponseFunctionProducer();
  })();

  return {
    cfFunctionViewerRequestTmpFilePath,
    cfFunctionViewerResponseTmpFilePath,
  };
}
