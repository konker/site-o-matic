import path from 'path';
import type Vorpal from 'vorpal';

import { VERSION } from '../../lib/consts';
import { manifestDerivedProps } from '../../lib/context';
import { loadManifest } from '../../lib/manifest';
import type { SomConfig } from '../../lib/types';
import { verror } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';
import { actionInfo } from './info';

export function actionLoadManifest(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    const pathToManifestFile = path.resolve(args.pathToManifestFile);
    const manifest = await loadManifest(pathToManifestFile);
    if (!manifest) {
      verror(vorpal, state, `Failed to load manifest from: ${pathToManifestFile}`);
      return;
    }

    const context = manifestDerivedProps(config, state.context, pathToManifestFile, manifest);
    state.updateContext(context);

    if (!state.plumbing) {
      vorpal.log(`Loaded manifest for: ${context.rootDomainName}`);
      vorpal.delimiter(`site-o-matic ${VERSION}: ${context.somId}>`);
      await actionInfo(vorpal, config, state)({ options: {} });
    }
  };
}
