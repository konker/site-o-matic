import ora from 'ora';

import { DEFAULT_INITIAL_CONTEXT } from './context';
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
      ...DEFAULT_INITIAL_CONTEXT,
    };
  }

  updateContext(context: SomContext) {
    this.context = context;
  }
}
