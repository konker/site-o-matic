import type Vorpal from 'vorpal';

import * as codestar from '../../lib/aws/codestar';
import { CODESTAR_CONNECTION_PROVIDER_TYPES } from '../../lib/aws/codestar';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import { verror, vtabulate } from '../../lib/ui/logging';
import type { SomGlobalState } from '../SomGlobalState';

export function actionAddCodeStarConnection(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (args: Vorpal.Args | string): Promise<void> => {
    if (typeof args === 'string') throw new Error('Error: string args to action');

    if (!CODESTAR_CONNECTION_PROVIDER_TYPES.includes(args.providerType)) {
      const errorMessage = `Invalid provider type: ${
        args.providerType
      }, must be one of: ${CODESTAR_CONNECTION_PROVIDER_TYPES.join(' | ')}`;
      verror(vorpal, state, errorMessage);
      return;
    }
    if (args.connectionName.length > 28) {
      const errorMessage = 'Connection name too long: ${args.connectionName}, must be 28 chars or less';
      verror(vorpal, state, errorMessage);
      return;
    }

    state.spinner.start();
    const data = await codestar.addCodeStarConnection(
      config,
      DEFAULT_AWS_REGION,
      args.connectionName,
      args.providerType
    );
    state.spinner.stop();

    vtabulate(vorpal, state, data, ['ConnectionName', 'ConnectionArn', 'ProviderType', 'ConnectionStatus']);
  };
}
