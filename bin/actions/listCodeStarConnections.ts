import type Vorpal from 'vorpal';

import * as codestar from '../../lib/aws/codestar';
import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { tabulate } from '../../lib/ui/tables';
import type { SomGlobalState } from '../SomGlobalState';

/**
 @deprecated
 */
export function actionListCodeStarConnections(vorpal: Vorpal, config: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    state.spinner.start();
    const data = await codestar.listCodeStarConnections(
      config,
      state.context.manifest?.region ?? config.AWS_REGION_CONTROL_PLANE
    );
    state.spinner.stop();

    const region = state.context.manifest?.region ?? config.AWS_REGION_CONTROL_PLANE;
    const message = data.some((i) => i.ConnectionStatus === 'PENDING')
      ? `NOTE: Pending connections must be confirmed in the AWS console
       https://${region}.console.aws.amazon.com/codesuite/settings/connections?region=${region}`
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
