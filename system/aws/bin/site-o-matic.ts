#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import chalk from 'chalk';

import { formulateSomId } from '../../../lib';
import {
  WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
  WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
} from '../../../lib/consts';
import { getFunctionProducer } from '../../../lib/edge';
import { loadManifest } from '../../../lib/manifest';
import config from '../../../site-o-matic.config.json';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';

async function main(): Promise<void> {
  const app = new cdk.App();

  // ----------------------------------------------------------------------
  const paramKeys = app.node.tryGetContext('paramsKeys') ?? '[]';
  const contextParams: Record<string, string> = JSON.parse(paramKeys).reduce(
    (acc: Record<string, string>, val: string) => {
      acc[val] = app.node.tryGetContext(val);
      return acc;
    },
    {}
  );

  // ----------------------------------------------------------------------
  const username = contextParams.iamUsername as string;
  const pathToManifestFile = contextParams.pathToManifestFile as string;
  const manifest = await loadManifest(pathToManifestFile);
  if (!manifest) {
    console.log(chalk.red(chalk.bold('Invalid manifest')));
    return;
  }

  const somId = formulateSomId(manifest.rootDomainName);

  // ----------------------------------------------------------------------
  // Viewer Request cfFunction
  const cfFunctionViewerRequestSubComponentIds = (
    manifest.redirect ? [WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID] : []
  ).concat(WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID);

  const viewerRequestFunctionProducer = getFunctionProducer(
    WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
    cfFunctionViewerRequestSubComponentIds,
    somId,
    {
      ...manifest,
      webHosting: {
        // Add a default root object if one is not specified
        defaultRootObject: WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
        ...manifest.webHosting,
      },
    }
  );
  if (!viewerRequestFunctionProducer) throw new Error(`Could not get functionProducer for Cloudfront viewer request`);
  const cfFunctionViewerRequest_TmpFilePath = await viewerRequestFunctionProducer();

  // ----------------------------------------------------------------------
  // Viewer Response cfFunction
  const viewerResponseFunctionProducer = getFunctionProducer(
    WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
    [],
    somId,
    manifest
  );
  if (!viewerResponseFunctionProducer) throw new Error(`Could not get functionProducer for Cloudfront viewer response`);
  const cfFunctionViewerResponse_TmpFilePath = await viewerResponseFunctionProducer();

  // ----------------------------------------------------------------------
  const stack = new SiteStack(app, config, somId, {
    ...manifest,
    username,
    contextParams,
    cfFunctionViewerRequestTmpFilePath: [
      WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
      cfFunctionViewerRequest_TmpFilePath,
    ],
    cfFunctionViewerResponseTmpFilePath: [
      WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
      cfFunctionViewerResponse_TmpFilePath,
    ],
    description: `Site-o-Matic Stack for ${manifest.rootDomainName}`,
  });
  await stack.build();
}

main().catch(console.error);
