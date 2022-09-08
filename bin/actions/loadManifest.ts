import path from 'path';
import type Vorpal from 'vorpal';

import type { SomConfig, SomState } from '../../lib/consts';
import { formulateSomId } from '../../lib/index';
import { loadManifest } from '../../lib/manifest';
import { actionInfo } from './info';

export function actionLoadManifest(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.pathToManifestFile = path.resolve(args.pathToManifestFile);

    /*
    const manifestJson = await fs.promises.readFile(state.pathToManifestFile as string);
    const manifest = JSON.parse(manifestJson.toString());
    const validManifest = validateManifest(manifest);
    if (!validManifest) {
      vorpal.log('Invalid manifest');
      return;
    }
    */
    const manifest = await loadManifest(state.pathToManifestFile);
    if (!manifest) {
      vorpal.log('Invalid manifest');
      return;
    }

    state.manifest = manifest;
    state.somId = formulateSomId(state.manifest.dns.domainName);
    state.rootDomain = state.manifest.dns.domainName;
    state.subdomains = state.manifest.dns.subdomains?.map((i: any) => i.domainName) ?? [];
    state.certificateCloneNames = state.manifest.certificate?.clones?.map((i: any) => i.name) ?? [];
    state.crossAccountAccessNames = state.manifest.crossAccountAccess?.map((i: any) => i.name) ?? [];
    state.siteUrl = `https://${state.manifest.dns.domainName}/`;
    state.registrar = state.manifest.registrar;
    state.protectedManifest = state.manifest.protected ? 'true' : 'false';

    vorpal.log(`Loaded manifest for: ${state.manifest.dns.domainName}`);

    await actionInfo(vorpal, config, state)({ options: {} });
  };
}
