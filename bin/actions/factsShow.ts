import type Vorpal from 'vorpal';

import type { SiteOMaticConfig } from '../../lib/config/schemas/site-o-matic-config.schema';
import { siteOMaticRules } from '../../lib/rules/site-o-matic.rules';
import type { SomGlobalState } from '../SomGlobalState';

export function actionShowFacts(vorpal: Vorpal, _: SiteOMaticConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args | string): Promise<void> => {
    const facts = await siteOMaticRules(state.context);
    if (state.plumbing) {
      vorpal.log(JSON.stringify({ context: state.context, data: facts }));
    } else {
      vorpal.log(JSON.stringify(facts, undefined, 2));
    }
  };
}
