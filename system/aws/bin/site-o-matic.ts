#!/usr/bin/env node

import assert from 'node:assert';

import { App } from 'cdktf';
import chalk from 'chalk';

import { loadConfig } from '../../../lib/config';
import { SOM, SOM_CONFIG_PATH_TO_DEFAULT_FILE } from '../../../lib/consts';
import { loadContext } from '../../../lib/context';
import { loadManifest } from '../../../lib/manifest';
import { siteOMaticRules } from '../../../lib/rules/site-o-matic.rules';
import type { SiteStackProps } from '../../../lib/types';
import { SiteStack } from '../defs/siteomatic/SiteStack';

async function main(): Promise<void> {
  const app = new App();

  const configLoad = await loadConfig(SOM_CONFIG_PATH_TO_DEFAULT_FILE);
  assert(configLoad, '[site-o-matic] Fatal Error: Failed to load config');
  const [config] = configLoad;

  // ----------------------------------------------------------------------
  const paramKeys = process.env.paramKeys ?? '[]';
  const contextParams: Record<string, string> = JSON.parse(paramKeys).reduce(
    (acc: Record<string, string>, val: string) => {
      acc[val] = process.env[val]!;
      return acc;
    },
    {}
  );

  // ----------------------------------------------------------------------
  if (!contextParams.pathToManifestFile) {
    console.error(`[${SOM}] Error: Bad context: missing pathToManifestFile`);
    return;
  }
  if (!contextParams.cdkCommand) {
    console.error(`[${SOM}] Error: Bad context: missing cdkCommand`);
    return;
  }
  const pathToManifestFile = contextParams.pathToManifestFile;
  const cdkCommand = contextParams.cdkCommand;
  const manifestLoad = await loadManifest(config, pathToManifestFile);
  if (!manifestLoad) {
    console.log(chalk.red(chalk.bold('Invalid manifest')));
    return;
  }
  const context = await loadContext(config, pathToManifestFile, cdkCommand, ...manifestLoad);
  const facts = await siteOMaticRules(context);

  // ----------------------------------------------------------------------
  // Generate the CDK Stacks
  const siteProps: SiteStackProps = {
    config,
    context,
    facts,
    locked: context.manifest.locked ?? false,
    contextParams,
    description: `Site-o-Matic Stack for ${context.manifest.domainName}`,
    env: {},
  };

  const siteStack = new SiteStack(app, siteProps);
  await siteStack.build();

  // Engage
  app.synth();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
