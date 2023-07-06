import chalk from 'chalk';
import type Vorpal from 'vorpal';

import type { SomState } from '../types';
import { tabulate } from './tables';

export function vlog(vorpal: Vorpal, state: SomState, message: string) {
  if (state.plumbing) {
    vorpal.log(JSON.stringify({ state, message }, undefined, 2));
  } else {
    vorpal.log(message);
  }
}

export function verror(vorpal: Vorpal, state: SomState, error: unknown) {
  if (state.plumbing) {
    vorpal.log(JSON.stringify({ state, error }, undefined, 2));
  } else {
    vorpal.log(chalk.red(`${error}`));
  }
}

export function vtabulate(
  vorpal: Vorpal,
  state: SomState,
  recs: Array<any>,
  headers: Array<string>,
  displayHeaders: Array<string> | undefined = undefined,
  truncate = false,
  colWidths: Array<number> = [30, 95, 15, 20, 20, 20, 20]
) {
  if (state.plumbing) {
    vorpal.log(JSON.stringify({ state, data: recs }, undefined, 2));
  } else {
    vorpal.log(tabulate(recs, headers, displayHeaders, truncate, colWidths));
  }
}
