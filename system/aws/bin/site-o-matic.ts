#!/usr/bin/env node

import * as fs from 'fs';
import * as YAML from 'yaml';
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';
import { formulateSomId } from '../../../lib';
import { CertificateCloneStack } from '../defs/siteomatic/site/CertificateCloneStack';
import 'json5/lib/register';

// @ts-ignore
import config from '../../../site-o-matic.config.json5';

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

  if (contextParams.cloneCertificates) {
    if (manifest.certificateClones?.length > 0) {
      for (const certificateClone of manifest.certificateClones) {
        console.log(`[site-o-matic] Cloning certificates to: ${certificateClone.account}/${certificateClone.region}`);
        const stack = new CertificateCloneStack(app, config, formulateSomId(manifest.rootDomain), {
          ...manifest,
          region: certificateClone.region,
          username,
          contextParams,
          env: {
            account: certificateClone.account,
            region: certificateClone.region,
          },
        });
        await stack.build();
      }
    }
  } else {
    const stack = new SiteStack(app, config, formulateSomId(manifest.rootDomain), {
      ...manifest,
      username,
      contextParams,
    });
    await stack.build();
  }
}

main().then(console.log).catch(console.error);
