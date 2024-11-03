import crypto from 'node:crypto';
import fs from 'node:fs';

import JSON5 from 'json5';
import type * as z from 'zod';

import type { ManifestLoad } from './manifest';

export async function loadValidData<T>(
  pathToData: string,
  schema: z.ZodEffects<z.ZodTypeAny, T>
): Promise<ManifestLoad<T> | undefined> {
  const json = await fs.promises.readFile(pathToData);
  const hash = crypto.createHash('md5').update(json).digest('hex');
  const data = JSON5.parse(json.toString());
  const validation = schema.safeParse(data);
  if (!validation.success) {
    console.error(validation.error);
    return undefined;
  }
  return [validation.data, hash];
}
