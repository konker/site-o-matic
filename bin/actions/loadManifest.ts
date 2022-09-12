import chalk from 'chalk';
import path from 'path';
import type Vorpal from 'vorpal';

import { formulateSomId } from '../../lib';
import { loadManifest } from '../../lib/manifest';
import type { SomConfig, SomState } from '../../lib/types';
import { actionInfo } from './info';

export function actionLoadManifest(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.pathToManifestFile = path.resolve(args.pathToManifestFile);

    const manifest = await loadManifest(state.pathToManifestFile);
    if (!manifest) {
      vorpal.log(chalk.red(chalk.bold('Invalid manifest')));
      return;
    }

    state.manifest = manifest;
    state.somId = formulateSomId(state.manifest.dns.domainName);
    state.rootDomain = state.manifest.dns.domainName;
    state.subdomains = state.manifest.dns.subdomains?.map((i: any) => i.domainName) ?? [];
    state.certificateCreate = !!state.manifest.certificate?.create;
    state.certificateCloneNames = state.manifest.certificate?.clones?.map((i: any) => i.name) ?? [];
    state.crossAccountAccessNames = state.manifest.crossAccountAccess?.map((i: any) => i.name) ?? [];
    state.siteUrl = `https://${state.manifest.dns.domainName}/`;
    state.registrar = state.manifest.registrar;
    state.protectedManifest = state.manifest.protected ? 'true' : 'false';

    vorpal.log(`Loaded manifest for: ${state.manifest.dns.domainName}`);

    await actionInfo(vorpal, config, state)({ options: {} });
  };
}
