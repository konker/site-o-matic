import type Vorpal from 'vorpal';

import * as codestar from '../../lib/aws/codestar';
import { DEFAULT_AWS_REGION } from '../../lib/consts';
import type { SomConfig } from '../../lib/types';
import { tabulate } from '../../lib/ui/tables';
import type { SomGlobalState } from '../SomGlobalState';

export function actionListCodeStarConnections(vorpal: Vorpal, config: SomConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await codestar.listCodeStarConnections(config, DEFAULT_AWS_REGION);
    state.spinner.stop();

    const message = data.some((i) => i.ConnectionStatus === 'PENDING')
      ? `NOTE: Pending connections must be confirmed in the AWS console
       https://${DEFAULT_AWS_REGION}.console.aws.amazon.com/codesuite/settings/connections?region=${DEFAULT_AWS_REGION}`
      : null;

    if (!state.plumbing) {
      vorpal.log(
        tabulate(data, ['ConnectionName', 'ConnectionArn', 'ProviderType', 'ConnectionStatus'], undefined, true)
      );

      if (message) {
        vorpal.log(message);
      }
    } else {
      vorpal.log(JSON.stringify({ context: state.context, data, message }));
    }
  };
}
