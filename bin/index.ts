import 'json5/lib/register';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as cfonts from 'cfonts';
import ora from 'ora';
import Vorpal from 'vorpal';

import { CODESTAR_CONNECTION_PROVIDER_TYPES } from '../lib/aws/codestar';
import { VERSION } from '../lib/consts';
import type { SomState } from '../lib/types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../site-o-matic.config.json';
import { actionAddCodeStarConnection } from './actions/addCodeStarConnection';
import { actionAddPublicKey } from './actions/addPublicKey';
import { actionAddSecret } from './actions/addSecret';
import { actionAddUser } from './actions/addUser';
import { actionClearScreen } from './actions/clearScreen';
import { actionDeleteCodeStarConnection } from './actions/deleteCodeStarConnection';
import { actionDeletePublicKey } from './actions/deletePublicKey';
import { actionDeleteSecret } from './actions/deleteSecret';
import { actionDeploy } from './actions/deploy';
import { actionDeployCheck } from './actions/deployCheck';
import { actionDestroy } from './actions/destroy';
import { actionInfo } from './actions/info';
import { actionListCodeStarConnections } from './actions/listCodeStarConnections';
import { actionListPublicKeys } from './actions/listPublicKeys';
import { actionListSecrets } from './actions/listSecrets';
import { actionListUsers } from './actions/listUsers';
import { actionLoadManifest } from './actions/loadManifest';
import { actionSetNameServersWithRegistrar } from './actions/setNameserversWithRegistrar';
import { actionShowManifest } from './actions/showManifest';
import { actionSynthesize } from './actions/synthesize';

// ----------------------------------------------------------------------
// MAIN
async function main() {
  const vorpal = new Vorpal();
  const state: SomState = {
    spinner: ora(),
    somVersion: VERSION,
  };

  cfonts.say('Site-O-Matic', {
    font: 'block',
    align: 'left',
    colors: ['#0075bd', '#fff', '#0075bd'],
    background: 'transparent',
    letterSpacing: 1,
    lineHeight: 1,
    env: 'node',
  });

  vorpal.command('clear', 'Clear the screen').alias('cls').action(actionClearScreen(vorpal, config, state));
  vorpal.command('load <pathToManifestFile>', 'Load a manifest file').action(actionLoadManifest(vorpal, config, state));
  vorpal.command('manifest', 'Show details of a loaded manifest').action(actionShowManifest(vorpal, config, state));
  vorpal.command('info', 'Show details about the site deployment').action(actionInfo(vorpal, config, state));

  vorpal.command('ls users', 'List users').action(actionListUsers(vorpal, config, state));
  vorpal.command('add user <username>', 'Add a user').action(actionAddUser(vorpal, config, state));

  vorpal.command('ls secrets', 'List secrets').action(actionListSecrets(vorpal, config, state));
  vorpal.command('add secret <name> <value>', 'Add a secret').action(actionAddSecret(vorpal, config, state));
  vorpal.command('del secret <name>', 'Delete a secret').action(actionDeleteSecret(vorpal, config, state));

  vorpal
    .command('ls keys <username>', 'List SSH public keys added for the given user')
    .action(actionListPublicKeys(vorpal, config, state));
  vorpal
    .command('add key <username> <pathToPublicKeyFile>', 'Add a SSH public key for the given user')
    .action(actionAddPublicKey(vorpal, config, state));
  vorpal
    .command('del key <username> <keyId>', 'Delete a SSH public key for the given user')
    .action(actionDeletePublicKey(vorpal, config, state));

  vorpal
    .command('ls codestar', 'List CodeStar connections')
    .action(actionListCodeStarConnections(vorpal, config, state));
  vorpal
    .command(
      'add codestar <providerType> <connectionName>',
      `Add a CodeStar connection, providerType: ${CODESTAR_CONNECTION_PROVIDER_TYPES}`
    )
    .action(actionAddCodeStarConnection(vorpal, config, state));
  vorpal
    .command('del codestar <connectionArn>', 'Delete a CodeStar connection')
    .action(actionDeleteCodeStarConnection(vorpal, config, state));

  vorpal
    .command('synth <username>', 'Synthesize the CDK stack under the given user')
    .action(actionSynthesize(vorpal, config, state));
  vorpal.command('check <username>', 'Perform deployment checks').action(actionDeployCheck(vorpal, config, state));
  vorpal
    .command('deploy <username>', 'Deploy the site under the given user')
    .action(actionDeploy(vorpal, config, state));
  vorpal
    .command('set nameservers', 'Set the nameservers automatically with the registrar, if configured')
    .action(actionSetNameServersWithRegistrar(vorpal, config, state));
  vorpal.command('destroy', 'Destroy the site').action(actionDestroy(vorpal, config, state));

  const app = vorpal.show().delimiter(`site-o-matic ${VERSION}>`);
  if (process.argv.length > 2) {
    vorpal.log(`Loading manifest file: ${process.argv[2]}`);
    await app.exec(`load ${process.argv[2]}`);
  } else {
    await app.exec('help');
  }
}

main().then(console.log).catch(console.error);
