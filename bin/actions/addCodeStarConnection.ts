import type Vorpal from 'vorpal';

import * as codestar from '../../lib/aws/codestar';
import { CODESTAR_CONNECTION_PROVIDER_TYPES } from '../../lib/aws/codestar';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { tabulate } from '../../lib/ui/tables';

export function actionAddCodeStarConnection(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (args: Vorpal.Args): Promise<void> => {
    if (!CODESTAR_CONNECTION_PROVIDER_TYPES.includes(args.providerType)) {
      vorpal.log(
        `Invalid provider type: ${args.providerType}, must be one of: ${CODESTAR_CONNECTION_PROVIDER_TYPES.join(' | ')}`
      );
      return;
    }
    if (args.connectionName.length > 28) {
      vorpal.log('Connection name too long: ${args.connectionName}, must be 28 chars or less');
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

    vorpal.log(tabulate(data, ['ConnectionName', 'ConnectionArn', 'ProviderType', 'ConnectionStatus']));
  };
}
