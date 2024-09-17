import { loadValidData } from '../json5';
import type { SiteOMaticManifest } from './schemas/site-o-matic-manifest.schema';

export async function loadManifest(pathToManifestFile: string): Promise<SiteOMaticManifest | undefined> {
  const validManifest = await loadValidData(pathToManifestFile);
  if (!validManifest) {
    return undefined;
  }

  return validManifest;
}

export function sortObjectKeys(o: object): object {
  return o;
}

export function manifestHash(manifest: SiteOMaticManifest): string {
  return JSON.stringify(sortObjectKeys(manifest));
}
