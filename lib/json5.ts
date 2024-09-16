import fs from 'node:fs';

import type { Schema } from 'ajv';
import AJV from 'ajv';
import JSON5 from 'json5';
import type * as z from 'zod';

import { WEB_HOSTING_TYPE_CLOUDFRONT_S3 } from './consts';
import { SiteOMaticManifest } from './manifest/schemas/site-o-matic-manifest-schema';

export function applyManifestDefaults<
  T extends { rootDomainName: string; protected?: boolean; dns?: object; webHosting?: object },
>(somManifest: T): T {
  return {
    ...somManifest,
    protected: somManifest.protected ?? false,
    dns: somManifest.dns ?? {
      domainName: somManifest.rootDomainName,
    },
    webHosting: somManifest.webHosting ?? {
      type: WEB_HOSTING_TYPE_CLOUDFRONT_S3,
    },
  };
}

export function validateData(data: unknown): z.SafeParseReturnType<unknown, SiteOMaticManifest> {
  return SiteOMaticManifest.safeParse(data);
}

export async function loadValidData(pathToData: string): Promise<SiteOMaticManifest | undefined> {
  const json = await fs.promises.readFile(pathToData);
  const data = JSON5.parse(json.toString());
  const validation = validateData(applyManifestDefaults(data));
  if (!validation.success) {
    console.log(validation.error);
    return undefined;
  }
  return validation.data;
}

// ----------------------------------------------------------------------
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

export function validateDataJsonSchema<T>(schema: Schema, data: T): boolean {
  const valid = ajv.validate(schema, data);
  if (!valid) {
    ajv.errors?.forEach((e) => console.log(e));
  }

  return valid;
}

export async function loadValidDataJsonSchema<T>(schema: Schema, pathToData: string): Promise<T | undefined> {
  const json = await fs.promises.readFile(pathToData);
  const data = JSON5.parse(json.toString());
  const validData = validateDataJsonSchema(schema, data);
  if (!validData) {
    return undefined;
  }
  return data;
}
