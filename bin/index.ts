// @ts-ignore
import * as cfonts from 'cfonts';
import Vorpal from 'vorpal';
import ora from 'ora';
import { SomState } from '../lib/consts';
import { actionShowManifest } from './actions/showManifest';
import { actionClearScreen } from './actions/clearScreen';
import { actionSetNameServersWithRegistrar } from './actions/setNameserversWithRegistrar';
import { actionListPublicKeys } from './actions/listPublicKeys';
import { actionDeploy } from './actions/deploy';
import { actionListSecrets } from './actions/listSecrets';
import { actionDeletePublicKey } from './actions/deletePublicKey';
import { actionLoadManifest } from './actions/loadManifest';
import { actionDestroy } from './actions/destroy';
import { actionInfo } from './actions/info';
import { actionDeleteSecret } from './actions/deleteSecret';
import { actionAddSecret } from './actions/addSecret';
import { actionAddPublicKey } from './actions/addPublicKey';
import { actionListUsers } from './actions/listUsers';
import { actionAddUser } from './actions/addUser';
import { actionCloneCertificates } from './actions/cloneCertificates';
import 'json5/lib/register';

// @ts-ignore
import config from '../site-o-matic.config.json5';

// ----------------------------------------------------------------------
// MAIN
async function main() {
  const vorpal = new Vorpal();
  const state: SomState = {
    spinner: ora(),
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

  vorpal.delimiter('site-o-matic$');

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
    .command('deploy <username>', 'Deploy the site under the given user')
    .action(actionDeploy(vorpal, config, state));
  vorpal
    .command('set nameservers', 'Set the nameservers automatically with the registrar, if configured')
    .action(actionSetNameServersWithRegistrar(vorpal, config, state));
  vorpal
    .command('cloneCerts <username>', 'Clone the SSL certificates under the given user')
    .action(actionCloneCertificates(vorpal, config, state));
  vorpal.command('destroy', 'Destroy the site').action(actionDestroy(vorpal, config, state));

  await vorpal.exec('help');
  await vorpal.show();
}

main().then(console.log).catch(console.error);
