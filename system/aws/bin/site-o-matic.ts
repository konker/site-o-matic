#!/usr/bin/env node

import * as fs from 'fs';
import * as YAML from 'yaml';
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';

async function main(): Promise<void> {
  const app = new cdk.App();

  const manifestPath = app.node.tryGetContext('pathToManifestFile');
  const manifestYaml = await fs.promises.readFile(manifestPath);
  const manifest = YAML.parse(manifestYaml.toString());

  const stack = new SiteStack(app, manifest);
  await stack.build();
}

main().then(console.log).catch(console.error);
