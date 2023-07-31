import type Vorpal from 'vorpal';

import { siteOMaticRules } from '../../lib/rules/site-o-matic.rules';
import type { SomGlobalState } from '../../lib/SomGlobalState';
import type { SomConfig } from '../../lib/types';

export function actionShowFacts(vorpal: Vorpal, _: SomConfig, state: SomGlobalState) {
  return async (_: Vorpal.Args): Promise<void> => {
    const facts = await siteOMaticRules(state.context);
    if (state.plumbing) {
      vorpal.log(JSON.stringify({ context: state.context, data: facts }));
    } else {
      vorpal.log(JSON.stringify(facts, undefined, 2));
    }
  };
}
