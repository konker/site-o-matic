import path from 'path';
import type Vorpal from 'vorpal';

import { manifestDerivedProps } from '../../lib/context';
import { loadManifest } from '../../lib/manifest';
import type { SomGlobalState } from '../../lib/SomGlobalState';
import type { SomConfig } from '../../lib/types';
import { verror } from '../../lib/ui/logging';
import { actionInfo } from './info';

export function actionLoadManifest(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args): Promise<void> => {
    const pathToManifestFile = path.resolve(args.pathToManifestFile);
    const manifest = await loadManifest(pathToManifestFile);
    if (!manifest) {
      verror(vorpal, state, `Failed to load manifest from: ${pathToManifestFile}`);
      return;
    }

    const context = manifestDerivedProps(state.context, pathToManifestFile, manifest);
    state.updateContext(context);

    if (!state.plumbing) {
      vorpal.log(`Loaded manifest for: ${context.rootDomainName}`);
      await actionInfo(vorpal, config, state)({ options: {} });
    }
  };
}
