import fs from 'node:fs';

import Handlebars from 'handlebars';

import type { SiteOMaticManifest } from '../manifest/schemas/site-o-matic-manifest-schema';
import * as cfFunctionsViewerRequest from './cf-functions/viewer-request';
import * as cfFunctionsViewerRequestDirDefault from './cf-functions/viewer-request/dir-default';
import * as cfFunctionsViewerRequestRedirect from './cf-functions/viewer-request/redirect';
import * as cfFunctionsViewerResponse from './cf-functions/viewer-response';
import generatorWarning from './generator-warning.json';
import { getTmpFilePath, undefinedFunctionGenerator } from './lib';

export type SomFunctionGenerator = () => Promise<string | undefined>;

export type SomFunctionProducer = {
  readonly ID: string;
  readonly TEMPLATE_FILE_PATH: string;
  readonly sortSubComponentIds: (subComponentIds: Array<string>) => Array<string>;
};

export function getFunctionProducer(
  id: string,
  subComponentIds: Array<string>,
  somId: string,
  manifest: SiteOMaticManifest
): SomFunctionGenerator {
  switch (id) {
    case cfFunctionsViewerRequest.ID:
      return createFunctionGenerator(cfFunctionsViewerRequest, subComponentIds, somId, manifest);
    case cfFunctionsViewerResponse.ID:
      // Placeholder for future implementation
      return undefinedFunctionGenerator;
    case cfFunctionsViewerRequestRedirect.ID:
      return createFunctionGenerator(cfFunctionsViewerRequestRedirect, subComponentIds, somId, manifest);
    case cfFunctionsViewerRequestDirDefault.ID:
      return createFunctionGenerator(cfFunctionsViewerRequestDirDefault, subComponentIds, somId, manifest);
    default:
      throw new Error(`Could not get FunctionProducer for ${id}`);
  }
}

export function createFunctionGenerator(
  functionProducer: SomFunctionProducer,
  subComponentIds: Array<string>,
  somId: string,
  manifest: SiteOMaticManifest
): SomFunctionGenerator {
  return async (): Promise<string | undefined> => {
    const tmpFilePath = getTmpFilePath(somId, functionProducer.ID);
    if (!tmpFilePath) {
      console.log(`ERROR: Could not generate function: Could not get tmp file path`);
      return undefined;
    }

    const subComponentFunctionProducers = functionProducer
      .sortSubComponentIds(subComponentIds)
      .map((subComponentId) => getFunctionProducer(subComponentId, [], somId, manifest));

    const subComponents = await Promise.all(
      subComponentFunctionProducers.map(async (subComponentFunctionProducer) => {
        const subComponentTmpFilePath = await subComponentFunctionProducer();
        if (!subComponentTmpFilePath) return ''; //[TODO: Throw error?]

        return fs.promises.readFile(subComponentTmpFilePath, 'utf8');
      })
    );

    const templateSrc = await fs.promises.readFile(functionProducer.TEMPLATE_FILE_PATH, 'utf8');
    const compliedTemplate = Handlebars.compile(templateSrc);
    const result = compliedTemplate({ manifest, subComponents, generatorWarning });
    if (!result) {
      console.log(`ERROR: Could not generate function`);
      return undefined;
    }
    await fs.promises.writeFile(tmpFilePath, result, 'utf8');

    return tmpFilePath;
  };
}
