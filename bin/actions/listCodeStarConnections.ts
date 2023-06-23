import type Vorpal from 'vorpal';

import * as codestar from '../../lib/aws/codestar';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomConfig, SomState } from '../../lib/types';
import { tabulate } from '../../lib/ui/tables';

export function actionListCodeStarConnections(vorpal: Vorpal, config: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await codestar.listCodeStarConnections(config, DEFAULT_AWS_REGION);
    state.spinner.stop();

    vorpal.log(
      tabulate(data, ['ConnectionName', 'ConnectionArn', 'ProviderType', 'ConnectionStatus'], undefined, true)
    );
    if (data.some((i) => i.ConnectionStatus === 'PENDING')) {
      vorpal.log(`
        NOTE: Pending connections must be confirmed in the AWS console
        https://${DEFAULT_AWS_REGION}.console.aws.amazon.com/codesuite/settings/connections?region=${DEFAULT_AWS_REGION}
        `);
    }
  };
}
