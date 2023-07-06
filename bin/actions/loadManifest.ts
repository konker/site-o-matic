import path from 'path';
import type Vorpal from 'vorpal';

import { calculateDomainHash, formulateSomId } from '../../lib';
import * as ssm from '../../lib/aws/ssm';
import { DEFAULT_AWS_REGION, SSM_PARAM_NAME_SOM_VERSION, UNKNOWN } from '../../lib/consts';
import { loadManifest } from '../../lib/manifest';
import type { SomConfig, SomState } from '../../lib/types';
import { verror } from '../../lib/ui/logging';
import { getParam } from '../../lib/utils';
import { actionInfo } from './info';

export function actionLoadManifest(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    state.pathToManifestFile = path.resolve(args.pathToManifestFile);

    const manifest = await loadManifest(state.pathToManifestFile);
    if (!manifest) {
      verror(vorpal, state, `Failed to load manifest from: ${state.pathToManifestFile}`);
      return;
    }

    state.manifest = manifest;
    state.somId = formulateSomId(state.manifest.rootDomainName);
    state.params = await ssm.getSsmParams(config, DEFAULT_AWS_REGION, state.somId);
    state.somVersion = getParam(state, SSM_PARAM_NAME_SOM_VERSION) ?? UNKNOWN;
    state.domainHash = calculateDomainHash(state.manifest.rootDomainName);
    state.rootDomainName = state.manifest.rootDomainName;
    state.subdomains = state.manifest.dns?.subdomains?.map((i: any) => i.domainName) ?? [];
    state.certificateCloneNames = state.manifest.certificate?.clones?.map((i: any) => i.name) ?? [];
    state.crossAccountAccessNames = state.manifest.crossAccountAccess?.map((i: any) => i.name) ?? [];
    state.siteUrl = `https://${state.manifest.rootDomainName}/`;
    state.registrar = state.manifest.registrar;
    state.protectedManifest = state.manifest.protected ? 'true' : 'false';

    if (!state.plumbing) {
      vorpal.log(`Loaded manifest for: ${state.manifest.rootDomainName}`);
      await actionInfo(vorpal, config, state)({ options: {} });
    }
  };
}
