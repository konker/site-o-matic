import path from 'path';
import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { CDK_COMMAND_NOTHING, VERSION } from '../../lib/consts';
import { manifestDerivedProps } from '../../lib/context';
import { loadManifest } from '../../lib/manifest';
import { verror } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';
import { actionInfo } from './info';

export function actionLoadManifest(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    const pathToManifestFile = path.resolve(args.pathToManifestFile);
    const manifestLoad = await loadManifest(config, pathToManifestFile);
    if (!manifestLoad) {
      verror(vorpal, state, `Failed to load manifest from: ${pathToManifestFile}`);
      return;
    }

    const context = manifestDerivedProps(
      config,
      state.context,
      pathToManifestFile,
      CDK_COMMAND_NOTHING,
      ...manifestLoad
    );
    state.updateContext(context);

    if (!state.plumbing) {
      vorpal.log(`Loaded manifest for: ${context.rootDomainName}`);
      vorpal.delimiter(`site-o-matic ${VERSION}: ${context.somId}>`);
      await actionInfo(vorpal, config, state)({ options: {} });
    }
  };
}
