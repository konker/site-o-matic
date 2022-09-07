import fs from 'fs';
import path from 'path';
import type Vorpal from 'vorpal';
import * as YAML from 'yaml';

import type { SomConfig, SomState } from '../../lib/consts';
import { formulateSomId } from '../../lib/index';
import { actionInfo } from './info';

export function actionLoadManifest(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.pathToManifestFile = path.resolve(args.pathToManifestFile);

    const manifestYaml = await fs.promises.readFile(state.pathToManifestFile as string);
    state.manifest = YAML.parse(manifestYaml.toString());
    state.somId = formulateSomId(state.manifest.rootDomain);
    state.rootDomain = state.manifest.rootDomain;
    state.subdomains = state.manifest.subdomains?.map((i: any) => i.domainName) ?? [];
    state.certificateCloneNames = state.manifest.certificateClones?.map((i: any) => i.name) ?? [];
    state.crossAccountAccessNames = state.manifest.crossAccountAccess?.map((i: any) => i.name) ?? [];
    state.siteUrl = `https://${state.manifest.rootDomain}/`;
    state.registrar = state.manifest.registrar;
    state.protectedManifest = state.manifest.protected ? 'true' : 'false';

    vorpal.log(`Loaded manifest for: ${state.manifest.rootDomain}`);

    await actionInfo(vorpal, config, state)({ options: {} });
  };
}
