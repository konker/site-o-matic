// ----------------------------------------------------------------------
import chalk from 'chalk';

import type { SomContentGenerator } from '../../../../../lib/content';
import { getContentProducer } from '../../../../../lib/content';
import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { SiteResourcesNestedStack } from '../SiteStack/SiteResourcesNestedStack';

// ----------------------------------------------------------------------
export type CloudfrontFunctionsLoaderResources = {
  readonly siteContentTmpDirPath: string | undefined;
};

// ----------------------------------------------------------------------
export async function load(
  siteResourcesStack: SiteResourcesNestedStack,
  webHostingSpec: WebHostingClauseWithResources
): Promise<CloudfrontFunctionsLoaderResources> {
  const siteContentTmpDirPath = await (async () => {
    if (
      siteResourcesStack.siteProps.facts.shouldDeployS3Content &&
      'content' in webHostingSpec &&
      webHostingSpec.content
    ) {
      const contentProducerId = webHostingSpec.content.producerId;
      const contentGenerator: SomContentGenerator = getContentProducer(contentProducerId);
      const ret = await contentGenerator(
        siteResourcesStack.siteProps.context.somId,
        webHostingSpec,
        siteResourcesStack.siteProps.context
      );
      if (ret) {
        console.log(chalk.blue(chalk.bold(`Created content dir: ${ret}`)));
      } else {
        console.log(chalk.yellow(chalk.bold('WARNING: Content generation failed')));
      }
      return ret;
    }
    return undefined;
  })();

  return {
    siteContentTmpDirPath,
  };
}
