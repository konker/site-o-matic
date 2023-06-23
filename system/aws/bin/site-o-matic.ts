#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import chalk from 'chalk';

import { formulateSomId } from '../../../lib';
import { getCodeCommitRepoForSite } from '../../../lib/aws/codecommit';
import { SITE_PIPELINE_TYPES_CODECOMMIT } from '../../../lib/consts';
import type { SomContentGenerator } from '../../../lib/content';
import { getContentProducer } from '../../../lib/content';
import { loadManifest } from '../../../lib/manifest';
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

  const somId = formulateSomId(manifest.dns.domainName);

  // Only generate the initial content if needed, i.e.:
  //  - The pipeline is based on a codecommit repo
  //  - A content producerId has been specified in the manifest
  //  - The codecommit repo does not yet exist
  let siteContentTmpDirPath: string | undefined;
  const contentProducerId = manifest.content?.producerId;
  const pipelineType = manifest.pipeline?.type;
  if (contentProducerId && pipelineType && SITE_PIPELINE_TYPES_CODECOMMIT.includes(pipelineType)) {
    const siteCodeCommitRepo = await getCodeCommitRepoForSite(somId);
    if (!siteCodeCommitRepo) {
      const contentGenerator: SomContentGenerator = getContentProducer(contentProducerId);
      siteContentTmpDirPath = await contentGenerator(somId, manifest);
      if (siteContentTmpDirPath) {
        console.log(chalk.blue(chalk.bold(`Created content dir: ${siteContentTmpDirPath}`)));
      } else {
        console.log(chalk.yellow(chalk.bold('WARNING: Content generation failed')));
      }
    } else {
      console.log(chalk.yellow(chalk.bold('CodeCommit repo exists, skip content generation')));
    }
  }

  const stack = new SiteStack(app, config, somId, {
    ...manifest,
    username,
    contextParams,
    siteContentTmpDirPath: siteContentTmpDirPath,
    description: `Site-o-Matic Stack for ${manifest.dns.domainName}`,
  });
  await stack.build();
}

main().then(console.log).catch(console.error);
