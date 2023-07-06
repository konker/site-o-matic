import fs from 'fs';
import Handlebars from 'handlebars';

import type { SomManifest } from '../types';
import * as cfFunctionsRedirect from './cf-functions/redirect';
import { getTmpFilePath } from './lib';

export type SomFunctionProducer = {
  readonly ID: string;
  readonly TEMPLATE_FILE_PATH: string;
};

export type SomFunctionGenerator = (somId: string, manifest: SomManifest) => Promise<string | undefined>;

function createFunctionGenerator(functionProducer: SomFunctionProducer): SomFunctionGenerator {
  return async (somId: string, manifest: SomManifest): Promise<string | undefined> => {
    const tmpFilePath = getTmpFilePath(somId, functionProducer.ID);
    if (!tmpFilePath) {
      console.log(`ERROR: Could not generate function: Could not get tmp file path`);
      return undefined;
    }

    const templateSrc = await fs.promises.readFile(functionProducer.TEMPLATE_FILE_PATH, 'utf8');
    const compliedTemplate = Handlebars.compile(templateSrc);
    const result = compliedTemplate({ manifest });
    if (!result) {
      console.log(`ERROR: Could not generate function`);
      return undefined;
    }
    await fs.promises.writeFile(tmpFilePath, result, 'utf8');

    return tmpFilePath;
  };
}

export function getFunctionProducer(id: string): SomFunctionGenerator {
  switch (id) {
    case cfFunctionsRedirect.ID:
      return createFunctionGenerator(cfFunctionsRedirect);
    default:
      throw new Error(`Could not get FunctionProducer for ${id}`);
  }
}
