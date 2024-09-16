#!/usr/bin/env node

import assert from 'assert';
import * as cdk from 'aws-cdk-lib';
import chalk from 'chalk';

import { loadConfig } from '../../../lib/config';
import {
  SOM_CONFIG_PATH_TO_DEFAULT_FILE,
  WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
  WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
} from '../../../lib/consts';
import type { SomContentGenerator } from '../../../lib/content';
import { getContentProducer } from '../../../lib/content';
import { loadContext } from '../../../lib/context';
import { getFunctionProducer } from '../../../lib/edge';
import { loadManifest } from '../../../lib/manifest';
import { siteOMaticRules } from '../../../lib/rules/site-o-matic.rules';
import { _somTag } from '../../../lib/utils';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';
import { SiteCertificateCloneSubStack } from '../defs/siteomatic/site/substacks/SiteCertificateCloneSubStack';

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

  // ----------------------------------------------------------------------
  // Viewer Request cfFunction
  const cfFunctionViewerRequestSubComponentIds = [WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID].concat(
    manifest.redirect ? [WEB_HOSTING_VIEWER_REQUEST_REDIRECT_FUNCTION_PRODUCER_ID] : []
  );

  const viewerRequestFunctionProducer = getFunctionProducer(
    WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
    cfFunctionViewerRequestSubComponentIds,
    context.somId,
    {
      ...manifest,
      webHosting: {
        // Add a default root object if one is not specified
        defaultRootObject: WEB_HOSTING_DEFAULT_DEFAULT_ROOT_OBJECT,
        ...manifest.webHosting,
      },
    }
  );
  if (!viewerRequestFunctionProducer) throw new Error(`Could not get functionProducer for Cloudfront viewer request`);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const cfFunctionViewerRequest_TmpFilePath = await viewerRequestFunctionProducer();

  // ----------------------------------------------------------------------
  // Viewer Response cfFunction
  const viewerResponseFunctionProducer = getFunctionProducer(
    WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
    [],
    context.somId,
    manifest
  );
  if (!viewerResponseFunctionProducer) throw new Error(`Could not get functionProducer for Cloudfront viewer response`);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const cfFunctionViewerResponse_TmpFilePath = await viewerResponseFunctionProducer();

  // ----------------------------------------------------------------------
  // Content?
  const siteContentTmpDirPath = await (async () => {
    if (facts.shouldDeployS3Content) {
      const contentProducerId = manifest.content?.producerId;
      const contentGenerator: SomContentGenerator = getContentProducer(contentProducerId);
      const ret = await contentGenerator(context.somId, context);
      if (ret) {
        console.log(chalk.blue(chalk.bold(`Created content dir: ${ret}`)));
      } else {
        console.log(chalk.yellow(chalk.bold('WARNING: Content generation failed')));
      }
      return ret;
    }
    return undefined;
  })();

  // ----------------------------------------------------------------------
  // Main site stack
  const siteStack = new SiteStack(app, {
    config,
    context,
    facts,
    protected: context.manifest.protected ?? false,
    username,
    contextParams,
    siteContentTmpDirPath,
    cfFunctionViewerRequestTmpFilePath: [
      WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
      cfFunctionViewerRequest_TmpFilePath,
    ],
    cfFunctionViewerResponseTmpFilePath: [
      WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
      cfFunctionViewerResponse_TmpFilePath,
    ],
    description: `Site-o-Matic Stack for ${manifest.rootDomainName}`,
  });
  await siteStack.build();
  _somTag(config, siteStack, context.somId);

  // ----------------------------------------------------------------------
  // Certificate clone sub-stack(s), if needed
  if (facts.shouldDeployCertificateClones) {
    const certificateClones = context.manifest.certificate?.clones ?? [];

    for (const certificateClone of certificateClones) {
      const certificateCloneSubStack = new SiteCertificateCloneSubStack(siteStack, {
        description: `Site-o-Matic certificate clone sub-stack for ${context.rootDomainName}`,
        env: {
          account: certificateClone.account,
          region: certificateClone.region,
        },
      });
      await certificateCloneSubStack.build();
      certificateCloneSubStack.addDependency(siteStack);
      _somTag(config, certificateCloneSubStack, context.somId);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
