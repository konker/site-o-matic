import * as manifestSchema from './schemas/manifest.json';
import AJV from 'ajv';
import fs from 'fs';
import type { SomManifest } from '../types';

const ajv = new AJV({
  addUsedSchema: false,
  allErrors: true,
  coerceTypes: true,
  inlineRefs: false,
  meta: true,
  multipleOfPrecision: 6,
  removeAdditional: true,
  // useDefaults: true,
  validateSchema: false,
  verbose: true,
  $data: true,
});

export function validateManifest(manifest: unknown): boolean {
  const valid = ajv.validate(manifestSchema, manifest);
  if (!valid) {
    ajv.errors?.forEach(console.log);
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

  return manifest as SomManifest;
}
