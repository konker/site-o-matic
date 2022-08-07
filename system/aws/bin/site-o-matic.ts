#!/usr/bin/env node

import * as fs from 'fs';
import * as YAML from 'yaml';
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';
import { formulateSomId } from '../../../lib';

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

  const username = contextParams.iamUsername;
  const manifestPath = contextParams.pathToManifestFile;
  const manifestYaml = await fs.promises.readFile(manifestPath);
  const manifest = YAML.parse(manifestYaml.toString());

  const stack = new SiteStack(app, formulateSomId(manifest.rootDomain), { ...manifest, username, contextParams });
  await stack.build();
}

main().then(console.log).catch(console.error);
