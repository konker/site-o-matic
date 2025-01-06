import fs from 'node:fs';

import Handlebars from 'handlebars';

import type {
  AuthClause,
  SiteOMaticManifest,
  WebHostingClauseWithResources,
} from '../manifest/schemas/site-o-matic-manifest.schema';
import type { SecretsSetCollection } from '../secrets/types';
import { CF_FUNCTIONS_HANDLEBARS_HELPERS } from './cf-functions/helpers';
import * as cfFunctionsViewerRequest from './cf-functions/viewer-request';
import * as cfFunctionsViewerRequestBasicAuth from './cf-functions/viewer-request/basic-auth';
import * as cfFunctionsViewerRequestDirDefault from './cf-functions/viewer-request/dir-default';
import * as cfFunctionsViewerRequestRedirect from './cf-functions/viewer-request/redirect';
import * as cfFunctionsViewerResponse from './cf-functions/viewer-response';
import * as cfFunctionsViewerResponseCspHashes from './cf-functions/viewer-response/csp-hashes';
import generatorWarning from './generator-warning.json';
import { getTmpFilePath } from './lib';

// --------------------------------------------------------------------------
export type SomFunctionCodeGenerator = () => Promise<string | undefined>;

export type SomFunctionFragmentProducerDef<S> = {
  readonly id: string;
  readonly spec: S | undefined;
};

// --------------------------------------------------------------------------
export type SomFunctionProducer<C extends object> = {
  readonly ID: string;
  readonly TEMPLATE_FILE_PATH: string;
  readonly sortFragmentProducerDefs: (
    fragmentProducerDefs: ReadonlyArray<SomFunctionFragmentProducerDef<unknown>>
  ) => ReadonlyArray<SomFunctionFragmentProducerDef<unknown>>;
  readonly createExtraContext: (
    somId: string,
    secrets: SecretsSetCollection,
    manifest: SiteOMaticManifest,
    webHostingSpec: WebHostingClauseWithResources
  ) => Promise<C>;
};

// --------------------------------------------------------------------------
export type SomFunctionFragmentProducer<S, C extends object> = {
  readonly ID: string;
  readonly TEMPLATE_FILE_PATH: string;
  readonly createExtraContext: (
    somId: string,
    secrets: SecretsSetCollection,
    manifest: SiteOMaticManifest,
    webHostingSpec: WebHostingClauseWithResources,
    spec: S
  ) => Promise<C>;
};

// --------------------------------------------------------------------------
export function getFunctionProducer(
  id: string,
  fragmentProducerDefs: ReadonlyArray<SomFunctionFragmentProducerDef<unknown>>,
  somId: string,
  secrets: SecretsSetCollection,
  manifest: SiteOMaticManifest,
  webHostingSpec: WebHostingClauseWithResources
): SomFunctionCodeGenerator {
  switch (id) {
    case cfFunctionsViewerRequest.ID:
      return createFunctionProducerExec(
        cfFunctionsViewerRequest,
        fragmentProducerDefs,
        somId,
        secrets,
        manifest,
        webHostingSpec
      );
    case cfFunctionsViewerResponse.ID:
      return createFunctionProducerExec(
        cfFunctionsViewerResponse,
        fragmentProducerDefs,
        somId,
        secrets,
        manifest,
        webHostingSpec
      );
    default:
      throw new Error(`Could not get FunctionProducer for ${id}`);
  }
}

export function getFunctionFragmentProducer<S>(
  id: string,
  spec: S,
  somId: string,
  secrets: SecretsSetCollection,
  manifest: SiteOMaticManifest,
  webHostingSpec: WebHostingClauseWithResources
): SomFunctionCodeGenerator {
  switch (id) {
    case cfFunctionsViewerRequestRedirect.ID:
      return createFunctionFragmentProducerExec(
        cfFunctionsViewerRequestRedirect,
        somId,
        secrets,
        manifest,
        webHostingSpec,
        spec
      );
    case cfFunctionsViewerRequestBasicAuth.ID:
      return createFunctionFragmentProducerExec(
        cfFunctionsViewerRequestBasicAuth,
        somId,
        secrets,
        manifest,
        webHostingSpec,
        spec as AuthClause
      );
    case cfFunctionsViewerRequestDirDefault.ID:
      return createFunctionFragmentProducerExec(
        cfFunctionsViewerRequestDirDefault,
        somId,
        secrets,
        manifest,
        webHostingSpec,
        spec
      );
    case cfFunctionsViewerResponseCspHashes.ID:
      return createFunctionFragmentProducerExec(
        cfFunctionsViewerResponseCspHashes,
        somId,
        secrets,
        manifest,
        webHostingSpec,
        spec
      );
    default:
      throw new Error(`Could not get FunctionProducer for ${id}`);
  }
}

// --------------------------------------------------------------------------
export async function renderFunctionTemplate<S, C extends object, HC extends object>(
  producer: SomFunctionProducer<C> | SomFunctionFragmentProducer<S, C>,
  tmpFilePath: string,
  context: HC
): Promise<void> {
  CF_FUNCTIONS_HANDLEBARS_HELPERS.forEach(([name, fn]) => Handlebars.registerHelper(name, fn));

  const templateSrc = await fs.promises.readFile(producer.TEMPLATE_FILE_PATH, 'utf8');
  const compliedTemplate = Handlebars.compile(templateSrc);

  const result = compliedTemplate({ ...context, generatorWarning });
  if (!result) {
    throw new Error(`ERROR: Could not generate function`);
  }
  await fs.promises.writeFile(tmpFilePath, result, 'utf8');
}

// --------------------------------------------------------------------------
export function createFunctionProducerExec<C extends object>(
  functionProducer: SomFunctionProducer<C>,
  fragmentProducerDefs: ReadonlyArray<SomFunctionFragmentProducerDef<unknown>>,
  somId: string,
  secrets: SecretsSetCollection,
  manifest: SiteOMaticManifest,
  webHostingSpec: WebHostingClauseWithResources
): SomFunctionCodeGenerator {
  return async (): Promise<string> => {
    const tmpFilePath = getTmpFilePath(somId, functionProducer.ID, webHostingSpec.domainName);
    if (!tmpFilePath) {
      throw new Error(`ERROR: Could not generate function: Could not get tmp file path`);
    }

    const functionFragmentProducers = functionProducer
      .sortFragmentProducerDefs(fragmentProducerDefs)
      .map((fragmentProducerDef) =>
        getFunctionFragmentProducer(
          fragmentProducerDef.id,
          fragmentProducerDef.spec,
          somId,
          secrets,
          manifest,
          webHostingSpec
        )
      );

    const subComponents = await Promise.all(
      functionFragmentProducers.map(async (subComponentFunctionGenerator) => {
        const subComponentTmpFilePath = await subComponentFunctionGenerator();
        if (!subComponentTmpFilePath) {
          throw new Error(`Could not produce subcomponent`);
        }

        return fs.promises.readFile(subComponentTmpFilePath, 'utf8');
      })
    );

    const extraContext = await functionProducer.createExtraContext(somId, secrets, manifest, webHostingSpec);

    await renderFunctionTemplate(functionProducer, tmpFilePath, {
      manifest,
      webHostingSpec,
      subComponents,
      ...extraContext,
    });

    return tmpFilePath;
  };
}

// --------------------------------------------------------------------------
export function createFunctionFragmentProducerExec<S, C extends object, P extends SomFunctionFragmentProducer<S, C>>(
  functionFragmentProducer: P,
  somId: string,
  secrets: SecretsSetCollection,
  manifest: SiteOMaticManifest,
  webHostingSpec: WebHostingClauseWithResources,
  spec: S
): SomFunctionCodeGenerator {
  return async (): Promise<string> => {
    const tmpFilePath = getTmpFilePath(somId, functionFragmentProducer.ID, webHostingSpec.domainName);
    if (!tmpFilePath) {
      throw new Error(`ERROR: Could not generate fragment: Could not get tmp file path`);
    }

    const extraContext = await functionFragmentProducer.createExtraContext(
      somId,
      secrets,
      manifest,
      webHostingSpec,
      spec
    );

    await renderFunctionTemplate(functionFragmentProducer, tmpFilePath, {
      manifest,
      webHostingSpec,
      spec,
      ...extraContext,
    });

    return tmpFilePath;
  };
}
