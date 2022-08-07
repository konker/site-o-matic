import Vorpal from 'vorpal';
import { SomState } from '../../lib/consts';
import path from 'path';
import fs from 'fs';
import * as YAML from 'yaml';
import { formulateSomId } from '../../lib/index';
import { actionInfo } from './info';

export function actionLoadManifest(vorpal: Vorpal, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.pathToManifestFile = path.resolve(args.pathToManifestFile);

    const manifestYaml = await fs.promises.readFile(state.pathToManifestFile as string);
    state.manifest = YAML.parse(manifestYaml.toString());
    state.somId = formulateSomId(state.manifest.rootDomain);
    state.rootDomain = state.manifest.rootDomain;
    state.subdomains = state.manifest.subdomains?.map((i: any) => i.domainName) ?? [];
    state.siteUrl = `https://${state.manifest.rootDomain}/`;
    state.registrar = state.manifest.registrar;

    vorpal.log(`Loaded manifest for: ${state.manifest.rootDomain}`);

    await actionInfo(vorpal, state)({ options: {} });
  };
}
