import type Vorpal from 'vorpal';

import * as ssm from '../../lib/aws/ssm';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { SSM_PARAM_PATH_ROOT_DOMAIN_NAME } from '../../lib/consts';
import { vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionSitesList(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    state.spinner.start();
    const data = await ssm.getSsmParams(config, config.AWS_REGION_CONTROL_PLANE, SSM_PARAM_PATH_ROOT_DOMAIN_NAME);
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['Param', 'Value'], ['Root Domain Name', 'somId']);
  };
}
