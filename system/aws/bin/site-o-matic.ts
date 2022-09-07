#!/usr/bin/env node

import 'source-map-support/register';
import 'json5/lib/register';

import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as YAML from 'yaml';

import { formulateSomId } from '../../../lib';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../../../site-o-matic.config.json5';
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
  const manifestPath = contextParams.pathToManifestFile as string;
  const manifestYaml = await fs.promises.readFile(manifestPath);
  const manifest = YAML.parse(manifestYaml.toString());

  const stack = new SiteStack(app, config, formulateSomId(manifest.rootDomain), {
    ...manifest,
    username,
    contextParams,
  });
  await stack.build();
}

main().then(console.log).catch(console.error);
