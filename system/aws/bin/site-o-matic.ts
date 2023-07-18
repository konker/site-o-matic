#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import chalk from 'chalk';

import { formulateSomId } from '../../../lib';
import {
  WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
  WEB_HOSTING_DIR_DEFAULT_FUNCTION_PRODUCER_ID,
} from '../../../lib/consts';
import { getFunctionProducer } from '../../../lib/edge';
import { loadManifest } from '../../../lib/manifest';
import { getRedirectTmpFilePathFromRedirect } from '../../../lib/redirect';
import config from '../../../site-o-matic.config.json';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';

async function main(): Promise<void> {
  const app = new cdk.App();

  const paramKeys = app.node.tryGetContext('paramsKeys') ?? '[]';
  const contextParams: Record<string, string> = JSON.parse(paramKeys).reduce(
    (acc: Record<string, string>, val: string) => {
      acc[val] = app.node.tryGetContext(val);
      return acc;
    },
    {}
  );

  const username = contextParams.iamUsername as string;
  const pathToManifestFile = contextParams.pathToManifestFile as string;
  const manifest = await loadManifest(pathToManifestFile);
  if (!manifest) {
    console.log(chalk.red(chalk.bold('Invalid manifest')));
    return;
  }

  const somId = formulateSomId(manifest.rootDomainName);

  const cfFunctionDirDefault_TmpFilePath = await (async () => {
    const functionProducer = getFunctionProducer(WEB_HOSTING_DIR_DEFAULT_FUNCTION_PRODUCER_ID);
    if (!functionProducer) throw new Error(`Could not get functionProducer for Cloudfront directory default`);
    return functionProducer(somId, {
      ...manifest,
      webHosting: {
        defaultRootObject: WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
        ...manifest.webHosting,
      },
    });
  })();

  const cfFunctionRedirect = await (async () => {
    if (manifest.redirect) {
      return getRedirectTmpFilePathFromRedirect(somId, manifest);
    }
    return ['redirect', undefined] as const;
  })();

  const stack = new SiteStack(app, config, somId, {
    ...manifest,
    username,
    contextParams,
    cfFunctionTmpFilePaths: [
      [WEB_HOSTING_DIR_DEFAULT_FUNCTION_PRODUCER_ID, cfFunctionDirDefault_TmpFilePath],
      [cfFunctionRedirect[0], cfFunctionRedirect[1]],
    ],
    description: `Site-o-Matic Stack for ${manifest.rootDomainName}`,
  });
  await stack.build();
}

main().catch(console.error);
