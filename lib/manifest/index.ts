import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';
import { loadValidData } from '../json5';
import { SiteOMaticManifest } from './schemas/site-o-matic-manifest.schema';

export type ManifestLoad<T> = [T, string];

export async function loadManifest(
  _config: SiteOMaticConfig,
  pathToManifestFile: string
): Promise<ManifestLoad<SiteOMaticManifest> | undefined> {
  return loadValidData(pathToManifestFile, SiteOMaticManifest);
}

export function sortObjectKeys(o: object): object {
  return o;
}

export function manifestHash(manifest: SiteOMaticManifest): string {
  return JSON.stringify(sortObjectKeys(manifest));
}
