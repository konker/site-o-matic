import { WEB_HOSTING_TYPE_CLOUDFRONT_S3 } from '../consts';
import { loadValidData } from '../json5';
import type { FromValidation, SomManifest } from '../types';
import * as schema from './schemas/site-o-matic-manifest.schema.json';

export async function loadManifest(pathToManifestFile: string): Promise<SomManifest | undefined> {
  const validManifest = await loadValidData<FromValidation<SomManifest>>(schema, pathToManifestFile);
  if (!validManifest) {
    return undefined;
  }

  // Apply defaults
  return {
    ...validManifest,
    protected: validManifest.protected ?? false,
    dns: validManifest.dns ?? {
      domainName: validManifest.rootDomainName,
    },
    webHosting: validManifest.webHosting ?? {
      type: WEB_HOSTING_TYPE_CLOUDFRONT_S3,
    },
  };
}

export function sortObjectKeys(o: object): object {
  return o;
}

export function manifestHash(manifest: SomManifest): string {
  return JSON.stringify(sortObjectKeys(manifest));
}
