#!/usr/bin/env node

import assert from 'assert';
import * as cdk from 'aws-cdk-lib';
import chalk from 'chalk';

import { loadConfig } from '../../../lib/config';
import { SOM_CONFIG_PATH_TO_DEFAULT_FILE } from '../../../lib/consts';
import { loadContext } from '../../../lib/context';
import { loadManifest } from '../../../lib/manifest';
import { siteOMaticRules } from '../../../lib/rules/site-o-matic.rules';
import { _somTag } from '../../../lib/utils';
import { SiteResourcesNestedStack } from '../defs/siteomatic/SiteStack/SiteResourcesNestedStack';

async function main(): Promise<void> {
  const app = new cdk.App();
  const config = await loadConfig(SOM_CONFIG_PATH_TO_DEFAULT_FILE);
  assert(config, '[site-o-matic] Fatal Error: Failed to load config');

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

  /*FIXME
   */

  // ----------------------------------------------------------------------
  // Main site stack
  const siteStack = new SiteResourcesNestedStack(app, {
    config,
    context,
    facts,
    locked: context.manifest.locked ?? false,
    username,
    contextParams,
    description: `Site-o-Matic Stack for ${manifest.domainName}`,
    env: {},
  });
  await siteStack.build();
  _somTag(config, siteStack, context.somId);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
