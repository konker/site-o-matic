import ora from 'ora';

import type { SiteOMaticConfig } from '../lib/config/schemas/site-o-matic-config.schema';
import { DEFAULT_INITIAL_CONTEXT } from '../lib/context';
import type { SomContext } from '../lib/types';

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
  config: SiteOMaticConfig;
  context: SomContext;

  constructor(config: SiteOMaticConfig, cliValues: Record<string, unknown>) {
    this.config = config;
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
