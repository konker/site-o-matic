import { getFunctionProducer } from '../edge';
import type { SomManifest } from '../types';

export const REDIRECT_TYPE_EDGE_CF_FUNCTION = 'edge-cf-function';
export const REDIRECT_TYPES = [REDIRECT_TYPE_EDGE_CF_FUNCTION] as const;

export const REDIRECT_TYPE_TO_FUNCTION_PRODUCER_ID = {
  [REDIRECT_TYPE_EDGE_CF_FUNCTION]: 'cf-functions-redirect',
};

export async function getRedirectTmpFilePathFromRedirect(
  somId: string,
  manifest: SomManifest
): Promise<string | undefined> {
  switch (manifest.redirect?.type) {
    case REDIRECT_TYPE_EDGE_CF_FUNCTION: {
      const functionProducer = getFunctionProducer(
        REDIRECT_TYPE_TO_FUNCTION_PRODUCER_ID[REDIRECT_TYPE_EDGE_CF_FUNCTION]
      );
      if (!functionProducer) return undefined;
      return functionProducer(somId, manifest);
    }
    default:
      throw new Error(`Could not get tmpFilePath for redirect type ${manifest.redirect?.type}`);
  }
}
