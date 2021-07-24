#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SomSiteStack } from '../defs/site/SomSiteStack';
import { SomSiteHostedZoneStack } from '../defs/hosted-zone/SomSiteHostedZoneStack';

async function main(): Promise<void> {
  const app = new cdk.App();

  const manifestDir = path.join(__dirname, '..', '..', '..', 'manifests');
  const manifestPath = path.join(manifestDir, 'site-o-matic.manifest.yaml');
  const manifestYaml = await fs.promises.readFile(manifestPath);
  const manifest = YAML.parse(manifestYaml.toString());

  for (const site of manifest.sites) {
    const stacks = [new SomSiteHostedZoneStack(app, site), new SomSiteStack(app, site)];
    await Promise.all(stacks.map((stack) => stack.build()));
  }
}

main().then(console.log).catch(console.error);
