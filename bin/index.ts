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
import { actionAddSecret } from './actions/addSecret';
import { actionClearScreen } from './actions/clearScreen';
import { actionDeleteSecret } from './actions/deleteSecret';
import { actionDeploy } from './actions/deploy';
import { actionDeployCheck } from './actions/deployCheck';
import { actionDestroy } from './actions/destroy';
import { actionDiff } from './actions/diff';
import { actionInfo } from './actions/info';
import { actionListSecrets } from './actions/listSecrets';
import { actionListSites } from './actions/listSites';
import { actionListUsers } from './actions/listUsers';
import { actionLoadManifest } from './actions/loadManifest';
import { actionSetNameServersWithRegistrar } from './actions/setNameserversWithRegistrar';
import { actionShowCOnfig } from './actions/showConfig';
import { actionShowContext } from './actions/showContext';
import { actionShowFacts } from './actions/showFacts';
import { actionShowManifest } from './actions/showManifest';
import { actionShowSecret } from './actions/showSecret';
import { actionStacks } from './actions/stacks';
import { actionSynthesize } from './actions/synthesize';
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

  const config = await loadConfig(SOM_CONFIG_PATH_TO_DEFAULT_FILE);
  assert(config, '[site-o-matic] Fatal Error: Failed to load config');

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
  vorpal.command('ls sites', 'List deployed sites').action(actionListSites(vorpal, config, globalState));
  vorpal
    .command('load <pathToManifestFile>', 'Load a manifest file')
    .action(actionLoadManifest(vorpal, config, globalState));
  vorpal
    .command('manifest', 'Show details of a loaded manifest')
    .action(actionShowManifest(vorpal, config, globalState));
  vorpal.command('facts', 'Show current facts').action(actionShowFacts(vorpal, config, globalState));
  vorpal.command('context', 'Show current context').action(actionShowContext(vorpal, config, globalState));
  vorpal.command('config', 'Show current config').action(actionShowCOnfig(vorpal, config, globalState));
  vorpal.command('info', 'Show details about the site deployment').action(actionInfo(vorpal, config, globalState));

  vorpal.command('ls users', 'List users').action(actionListUsers(vorpal, config, globalState));
  /*[XXX]
  vorpal.command('add user <username>', 'Add a user').action(actionAddUser(vorpal, config, globalState));
  */

  // TODO: change this to SSM secure strings?
  vorpal.command('ls secrets', 'List secrets').action(actionListSecrets(vorpal, config, globalState));
  vorpal.command('add secret <name> <value>', 'Add a secret').action(actionAddSecret(vorpal, config, globalState));
  vorpal.command('show secret <name>', 'Reveal a secret value').action(actionShowSecret(vorpal, config, globalState));
  vorpal.command('del secret <name>', 'Delete a secret').action(actionDeleteSecret(vorpal, config, globalState));

  /*[XXX: do we need this really?]
  vorpal
    .command('ls keys <username>', 'List SSH public keys added for the given user')
    .action(actionListPublicKeys(vorpal, config, globalState));
  vorpal
    .command('add key <username> <pathToPublicKeyFile>', 'Add a SSH public key for the given user')
    .action(actionAddPublicKey(vorpal, config, globalState));
  vorpal
    .command('del key <username> <keyId>', 'Delete a SSH public key for the given user')
    .action(actionDeletePublicKey(vorpal, config, globalState));

  vorpal
    .command('ls codestar', 'List CodeStar connections')
    .action(actionListCodeStarConnections(vorpal, config, globalState));
  vorpal
    .command(
      'add codestar <providerType> <connectionName>',
      `Add a CodeStar connection, providerType: ${CODESTAR_CONNECTION_PROVIDER_TYPES}`
    )
    .action(actionAddCodeStarConnection(vorpal, config, globalState));
  vorpal
    .command('del codestar <connectionArn>', 'Delete a CodeStar connection')
    .action(actionDeleteCodeStarConnection(vorpal, config, globalState));
  */

  vorpal.command('stacks', 'List the CDK stacks').action(actionStacks(vorpal, config, globalState));
  vorpal.command('synth', 'Synthesize the CDK stack').action(actionSynthesize(vorpal, config, globalState));
  vorpal
    .command('diff', 'Diff the CDK stack with the currently deployed resources,')
    .action(actionDiff(vorpal, config, globalState));
  vorpal.command('check', 'Perform deployment checks').action(actionDeployCheck(vorpal, config, globalState));
  vorpal.command('deploy', 'Deploy the site').action(actionDeploy(vorpal, config, globalState));
  vorpal
    .command('set nameservers', 'Set the nameservers automatically with the registrar, if configured')
    .action(actionSetNameServersWithRegistrar(vorpal, config, globalState));
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
