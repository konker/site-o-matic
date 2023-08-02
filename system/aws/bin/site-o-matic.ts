#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import chalk from 'chalk';

import {
  WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
  WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
} from '../../../lib/consts';
import type { SomContentGenerator } from '../../../lib/content';
import { getContentProducer } from '../../../lib/content';
import { loadContext } from '../../../lib/context';
import { getFunctionProducer } from '../../../lib/edge';
import { loadManifest } from '../../../lib/manifest';
import { siteOMaticRules } from '../../../lib/rules/site-o-matic.rules';
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
  const context = await loadContext(config, pathToManifestFile, manifest);
  const facts = await siteOMaticRules(context);

  // ----------------------------------------------------------------------
  // Viewer Request cfFunction
  const cfFunctionViewerRequestSubComponentIds = [WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID].concat(
    manifest.redirect ? [WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID] : []
  );

  const viewerRequestFunctionProducer = getFunctionProducer(
    WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
    cfFunctionViewerRequestSubComponentIds,
    context.somId,
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
    context.somId,
    manifest
  );
  if (!viewerResponseFunctionProducer) throw new Error(`Could not get functionProducer for Cloudfront viewer response`);
  const cfFunctionViewerResponse_TmpFilePath = await viewerResponseFunctionProducer();

  // ----------------------------------------------------------------------
  // Content?
  const siteContentTmpDirPath = await (async () => {
    if (facts.shouldDeployS3Content) {
      const contentProducerId = manifest.content?.producerId;
      const contentGenerator: SomContentGenerator = getContentProducer(contentProducerId);
      const ret = await contentGenerator(context.somId, context);
      if (ret) {
        console.log(chalk.blue(chalk.bold(`Created content dir: ${ret}`)));
      } else {
        console.log(chalk.yellow(chalk.bold('WARNING: Content generation failed')));
      }
      return ret;
    }
    return undefined;
  })();

  // ----------------------------------------------------------------------
  const stack = new SiteStack(app, {
    config,
    context,
    facts,
    protected: context.manifest.protected,
    username,
    contextParams,
    siteContentTmpDirPath,
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
