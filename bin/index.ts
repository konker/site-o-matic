#!/usr/bin/env node

import assert from 'assert';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as cfonts from 'cfonts';
import type { ParseArgsConfig } from 'util';
import { parseArgs } from 'util';
import Vorpal from 'vorpal';

import { loadConfig } from '../lib/config';
import { SOM, SOM_CONFIG_PATH_TO_DEFAULT_FILE, VERSION } from '../lib/consts';
import { actionClearScreen } from './actions/clearScreen';
import { actionConfigShow } from './actions/configShow';
import { actionContextShow } from './actions/contextShow';
import { actionDeploy } from './actions/deploy';
import { actionDeployCheck } from './actions/deployCheck';
import { actionDestroy } from './actions/destroy';
import { actionDiff } from './actions/diff';
import { actionFactsShow } from './actions/factsShow';
import { actionInfo } from './actions/info';
import { actionLoadManifest } from './actions/loadManifest';
import { actionManifestShow } from './actions/manifestShow';
import { actionNameServersSetWithRegistrar } from './actions/nameserversSetWithRegistrar';
import { actionPlan } from './actions/plan';
import { actionSecretsAdd } from './actions/secretsAdd';
import { actionSecretsDelete } from './actions/secretsDelete';
import { actionSecretsList } from './actions/secretsList';
import { actionSecretsShow } from './actions/secretsShow';
import { actionSitesList } from './actions/sitesList';
import { actionStacks } from './actions/stacks';
import { actionSynthesize } from './actions/synthesize';
import { actionUsersList } from './actions/usersList';
import { SomGlobalState } from './SomGlobalState';

const ARG_PARSE_CONFIG: ParseArgsConfig = {
  strict: true,
  options: {
    manifest: { type: 'string', short: 'm' },
    yes: { type: 'boolean' },
    plumbing: { type: 'boolean' },
  },
  tokens: true,
  allowPositionals: true,
};

// ----------------------------------------------------------------------
// MAIN
async function main() {
  const { values, positionals } = parseArgs(ARG_PARSE_CONFIG);

  const vorpal = new Vorpal();
  vorpal.history(SOM);

  const configLoad = await loadConfig(SOM_CONFIG_PATH_TO_DEFAULT_FILE);
  assert(configLoad, '[site-o-matic] Fatal Error: Failed to load config');
  const [config] = configLoad;

  const globalState = new SomGlobalState(config, values);

  if (!globalState.plumbing) {
    console.log('\n');
    cfonts.say('Site-O-Matic', {
      font: 'block',
      align: 'left',
      space: false,
      colors: ['#0075bd', '#fff', '#0075bd'],
      background: 'transparent',
      letterSpacing: 1,
      lineHeight: 1,
      env: 'node',
    });
    console.log('  A konker.dev production\n\n');
  }

  vorpal
    .command('clear', 'Clear the screen')
    .alias('cls')
    .action(actionClearScreen(vorpal, config, globalState));
  vorpal.command('sites', 'List deployed sites').action(actionSitesList(vorpal, config, globalState));
  vorpal
    .command('load <pathToManifestFile>', 'Load a manifest file')
    .action(actionLoadManifest(vorpal, config, globalState));
  vorpal
    .command('manifest', 'Show details of a loaded manifest')
    .action(actionManifestShow(vorpal, config, globalState));
  vorpal.command('facts', 'Show current facts').action(actionFactsShow(vorpal, config, globalState));
  vorpal.command('context', 'Show current context').action(actionContextShow(vorpal, config, globalState));
  vorpal.command('config', 'Show current config').action(actionConfigShow(vorpal, config, globalState));
  vorpal.command('info', 'Show details about the site deployment').action(actionInfo(vorpal, config, globalState));
  vorpal.command('users', 'List users').action(actionUsersList(vorpal, config, globalState));

  vorpal.command('secrets ls', 'List secrets').action(actionSecretsList(vorpal, config, globalState));
  vorpal
    .command('secrets add <name> [<value>]', 'Add a secret, you will be prompted for a value if it is not provided.')
    .action(actionSecretsAdd(vorpal, config, globalState));
  vorpal.command('secrets show <name>', 'Reveal a secret value').action(actionSecretsShow(vorpal, config, globalState));
  vorpal.command('secrets del <name>', 'Delete a secret').action(actionSecretsDelete(vorpal, config, globalState));

  vorpal.command('stacks', 'List the CDK stacks').action(actionStacks(vorpal, config, globalState));
  vorpal.command('synth', 'Synthesize the CDK stack').action(actionSynthesize(vorpal, config, globalState));
  vorpal.command('plan', 'Plan the CDK stack changes').action(actionPlan(vorpal, config, globalState));
  vorpal
    .command('diff', 'Diff the CDK stack with the currently deployed resources,')
    .action(actionDiff(vorpal, config, globalState));
  vorpal.command('check', 'Perform deployment checks').action(actionDeployCheck(vorpal, config, globalState));
  vorpal.command('deploy', 'Deploy the site').action(actionDeploy(vorpal, config, globalState));
  vorpal
    .command('nameservers set', 'Set the nameservers automatically with the registrar, if configured')
    .action(actionNameServersSetWithRegistrar(vorpal, config, globalState));
  vorpal.command('destroy', 'Destroy the site').action(actionDestroy(vorpal, config, globalState));

  const app = vorpal.delimiter(globalState.plumbing ? '' : `site-o-matic ${VERSION}>`);
  if (!globalState.plumbing) {
    app.show();
  }

  if (values.manifest) {
    await app.exec(`load ${values.manifest}`);
  }
  if (positionals.length > 0) {
    await app.exec(positionals.join(' '));
  }

  if (globalState.plumbing) vorpal.execSync('exit');
}

main().catch(console.error);
