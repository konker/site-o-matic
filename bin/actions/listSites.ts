import type Vorpal from 'vorpal';

import * as ssm from '../../lib/aws/ssm';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import { vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionListSites(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    state.spinner.start();
    const data = await ssm.getSsmParams(config, DEFAULT_AWS_REGION, '/som/site/root-domain-name');
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['Param', 'Value'], ['Root Domain Name', 'somId']);
  };
}
