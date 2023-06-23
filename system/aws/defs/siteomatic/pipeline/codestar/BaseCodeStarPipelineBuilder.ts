import type { Construct } from 'constructs';

import type { BaseSitePipelineResources, PipelineBuilderProps } from '../../../../../../lib/types';
import * as SitePipelineStack from '../BasePipelineBuilder';

export async function build(scope: Construct, props: PipelineBuilderProps): Promise<BaseSitePipelineResources> {
  if (!props.siteStack.domainUser) {
    throw new Error(`[site-o-matic] Could not build pipeline sub-stack when domainUser is missing`);
  }

  const parentResources = SitePipelineStack.build(scope, props);

  return {
    ...parentResources,
  };
}
