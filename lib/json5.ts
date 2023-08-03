import type { Schema } from 'ajv';
import AJV from 'ajv';
import fs from 'fs';
import JSON5 from 'json5';

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

export function validateData<T>(schema: Schema, data: T): boolean {
  const valid = ajv.validate(schema, data);
  if (!valid) {
    ajv.errors?.forEach((e) => console.log(e));
  }

  return valid;
}

export async function loadValidData<T>(schema: Schema, pathToData: string): Promise<T | undefined> {
  const json = await fs.promises.readFile(pathToData);
  const data = JSON5.parse(json.toString());
  const validData = validateData(schema, data);
  if (!validData) {
    return undefined;
  }
  return data;
}
