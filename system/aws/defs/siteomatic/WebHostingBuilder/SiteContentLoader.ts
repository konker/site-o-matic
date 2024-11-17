import chalk from 'chalk';

import type { SomContentGenerator } from '../../../../../lib/content';
import { getContentProducer } from '../../../../../lib/content';
import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { SiteStack } from '../SiteStack';

// ----------------------------------------------------------------------
export type CloudfrontFunctionsLoaderResources = {
  readonly siteContentTmpDirPath: string | undefined;
};

// ----------------------------------------------------------------------
export async function load(
  siteStack: SiteStack,
  webHostingSpec: WebHostingClauseWithResources
): Promise<CloudfrontFunctionsLoaderResources> {
  const siteContentTmpDirPath = await (async () => {
    if (siteStack.siteProps.facts.shouldDeployS3Content && 'content' in webHostingSpec && webHostingSpec.content) {
      const contentProducerId = webHostingSpec.content.producerId;
      const contentGenerator: SomContentGenerator = getContentProducer(contentProducerId);
      const ret = await contentGenerator(
        siteStack.siteProps.context.somId,
        webHostingSpec,
        siteStack.siteProps.context
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
