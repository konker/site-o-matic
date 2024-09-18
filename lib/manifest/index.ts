import { loadValidData } from '../json5';
import { SiteOMaticManifest } from './schemas/site-o-matic-manifest.schema';

export async function loadManifest(pathToManifestFile: string): Promise<SiteOMaticManifest | undefined> {
  return loadValidData(pathToManifestFile, SiteOMaticManifest);
}

export function sortObjectKeys(o: object): object {
  return o;
}

export function manifestHash(manifest: SiteOMaticManifest): string {
  return JSON.stringify(sortObjectKeys(manifest));
}
