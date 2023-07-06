#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import chalk from 'chalk';

import { formulateSomId } from '../../../lib';
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

  const cfFunctionTmpFilePath = await (async () => {
    if (manifest.redirect) {
      return getRedirectTmpFilePathFromRedirect(somId, manifest);
    }
    return undefined;
  })();

  const stack = new SiteStack(app, config, somId, {
    ...manifest,
    username,
    contextParams,
    cfFunctionTmpFilePath,
    description: `Site-o-Matic Stack for ${manifest.rootDomainName}`,
  });
  await stack.build();
}

main().catch(console.error);
