import chalk from 'chalk';
import type Vorpal from 'vorpal';

import type { SomGlobalState } from '../SomGlobalState';
import { tabulate } from './tables';

export function vlog(vorpal: Vorpal, state: SomGlobalState, message: string) {
  if (state.plumbing) {
    vorpal.log(JSON.stringify({ context: state.context, message }));
  } else {
    vorpal.log(message);
  }
}

export function verror(vorpal: Vorpal, state: SomGlobalState, error: unknown) {
  if (state.plumbing) {
    vorpal.log(JSON.stringify({ context: state.context, error }));
  } else {
    vorpal.log(chalk.red(`${error}`));
  }
}

export function vtabulate(
  vorpal: Vorpal,
  state: SomGlobalState,
  recs: Array<any>,
  headers: Array<string>,
  displayHeaders: Array<string> | undefined = undefined,
  truncate = false,
  colWidths: Array<number> = [30, 95, 15, 20, 20, 20, 20]
) {
  if (state.plumbing) {
    vorpal.log(JSON.stringify({ context: state.context, data: recs }));
  } else {
    vorpal.log(tabulate(recs, headers, displayHeaders, truncate, colWidths));
  }
}
