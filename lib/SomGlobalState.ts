import ora from 'ora';

import { VERSION } from './consts';
import type { SomContext } from './types';

const spinner = (plumbing: boolean) =>
  plumbing
    ? {
        start: () => {
          return;
        },
        stop: () => {
          return;
        },
      }
    : ora();

export class SomGlobalState {
  spinner: any;
  plumbing: boolean;
  yes: boolean;
  context: SomContext;

  constructor(cliValues: Record<string, unknown>) {
    this.plumbing = Boolean(cliValues.plumbing);
    this.spinner = spinner(this.plumbing);
    this.yes = Boolean(cliValues.yes);
    this.context = {
      somVersion: VERSION,
      rootDomainName: 'UNKNOWN ROOT DOMAIN NAME',
    };
  }

  updateContext(context: SomContext) {
    this.context = context;
  }
}
