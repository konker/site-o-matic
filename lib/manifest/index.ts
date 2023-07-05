import AJV from 'ajv';
import fs from 'fs';

import { WEB_HOSTING_TYPE_CLOUDFRONT_S3 } from '../consts';
import type { SomManifest } from '../types';
import * as manifestSchema from './schemas/som-manifest.json';

const ajv = new AJV({
  addUsedSchema: false,
  allErrors: true,
  coerceTypes: false,
  inlineRefs: false,
  meta: true,
  multipleOfPrecision: 6,
  removeAdditional: false,
  useDefaults: false,
  validateSchema: true,
  verbose: true,
  strict: true,
  $data: true,
});

export function validateManifest(manifest: unknown): boolean {
  const valid = ajv.validate(manifestSchema, manifest);
  if (!valid) {
    ajv.errors?.forEach((e) => console.log(e));
  }

  return valid;
}

export async function loadManifest(pathToManifestFile: string): Promise<SomManifest | undefined> {
  const manifestJson = await fs.promises.readFile(pathToManifestFile);
  const manifest = JSON.parse(manifestJson.toString());
  const validManifest = validateManifest(manifest);
  if (!validManifest) {
    return undefined;
  }

  // Apply defaults
  return {
    ...manifest,
    protected: manifest.protected ?? false,
    webHosting: manifest.webHosting ?? {
      type: WEB_HOSTING_TYPE_CLOUDFRONT_S3,
    },
  };
}
