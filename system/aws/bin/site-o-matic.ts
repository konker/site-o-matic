#!/usr/bin/env node

import assert from 'assert';
import * as cdk from 'aws-cdk-lib';
import chalk from 'chalk';

import { loadConfig } from '../../../lib/config';
import { BOOTSTRAP_STACK_ID, SITE_RESOURCES_STACK_ID, SOM_CONFIG_PATH_TO_DEFAULT_FILE } from '../../../lib/consts';
import { loadContext } from '../../../lib/context';
import { loadManifest } from '../../../lib/manifest';
import { siteOMaticRules } from '../../../lib/rules/site-o-matic.rules';
import { _somTag } from '../../../lib/utils';
import { SiteBootstrapStack } from '../defs/siteomatic/SiteStack/SiteBootstrapStack';
import { SiteResourcesStack } from '../defs/siteomatic/SiteStack/SiteResourcesStack';

async function main(): Promise<void> {
  const app = new cdk.App();
  const configLoad = await loadConfig(SOM_CONFIG_PATH_TO_DEFAULT_FILE);
  assert(configLoad, '[site-o-matic] Fatal Error: Failed to load config');
  const [config] = configLoad;

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
  const pathToManifestFile = contextParams.pathToManifestFile!;
  const manifestLoad = await loadManifest(pathToManifestFile);
  if (!manifestLoad) {
    console.log(chalk.red(chalk.bold('Invalid manifest')));
    return;
  }
  const context = await loadContext(config, pathToManifestFile, ...manifestLoad);
  const facts = await siteOMaticRules(context);

  // ----------------------------------------------------------------------
  // Generate the CDK Stacks
  const siteProps = {
    config,
    context,
    facts,
    locked: context.manifest.locked ?? false,
    contextParams,
    description: `Site-o-Matic Stack for ${context.manifest.domainName}`,
    env: {
      accountId: process.env.CDK_DEFAULT_ACCOUNT!,
      region: process.env.CDK_DEFAULT_REGION!,
    },
  };

  /*[XXX]
  const siteStack = new SiteStack(app, siteProps);
  await siteStack.build();
  _somTag(config, siteStack, context.somId);
  */

  const bootstrapStack = new SiteBootstrapStack(app, BOOTSTRAP_STACK_ID(context.somId), siteProps);
  await bootstrapStack.build();
  _somTag(config, bootstrapStack, context.somId);

  const siteResourcesStack = new SiteResourcesStack(app, SITE_RESOURCES_STACK_ID(context.somId), siteProps);
  await siteResourcesStack.build();
  siteResourcesStack.addDependency(bootstrapStack);
  _somTag(config, siteResourcesStack, context.somId);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
