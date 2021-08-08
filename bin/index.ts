import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import Vorpal from 'vorpal';
import chalk from 'chalk';
import ora from 'ora';
import * as AWS from 'aws-sdk';
import { formulateSomId } from '../lib';
import { tabulate } from '../lib/ui/tables';
import * as cdkExec from '../lib/aws/cdkExec';
import * as ssm from '../lib/aws/ssm';
import * as iam from '../lib/aws/iam';
import * as secretsmanager from '../lib/aws/secretsmanager';
import * as status from '../lib/status';
import { AWS_REGION, CLS, SomState } from '../lib/consts';
import { getParam } from '../lib/utils';
import { formatStatus, getSomTxtRecord } from '../lib/status';
import { removeVerificationCnameRecord } from '../lib/aws/route53';
import { deleteAllPublicKeys } from '../lib/aws/iam';
import { getSiteConnectionStatus } from '../lib/http';
import { getRegistrarConnector } from '../lib/registrar/index';

// ----------------------------------------------------------------------
// ACTIONS
const actionDummy =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    vorpal.log(JSON.stringify(args, undefined, 2));
  };

const actionClearScreen =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    vorpal.log(CLS);
  };

const actionLoadManifest =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    state.pathToManifestFile = path.resolve(args.pathToManifestFile);

    const manifestYaml = await fs.promises.readFile(state.pathToManifestFile as string);
    state.manifest = YAML.parse(manifestYaml.toString());
    state.somId = formulateSomId(state.manifest.rootDomain);
    state.rootDomain = state.manifest.rootDomain;
    state.siteUrl = `https://${state.manifest.rootDomain}/`;
    state.registrar = state.manifest.registrar;

    vorpal.log(`Loaded manifest for: ${state.manifest.rootDomain}`);

    await actionInfo(vorpal, state)({ options: {} });
  };

const actionShowManifest =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }
    vorpal.log(JSON.stringify(state.manifest, undefined, 2));
  };

const actionListUsers =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const users = await iam.listSomUsers(AWS_REGION);
    state.spinner.stop();

    vorpal.log(tabulate(users, ['UserName']));
  };

const actionAddUser =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const users = await iam.addSomUser(AWS_REGION, args.username);
    state.spinner.stop();

    vorpal.log(tabulate(users, ['UserName']));
  };

const actionListSecrets =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.listSomSecrets(AWS_REGION);
    state.spinner.stop();

    vorpal.log(tabulate(data, ['Name']));
  };

const actionAddSecret =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.addSomSecret(AWS_REGION, args.name, args.value);
    state.spinner.stop();

    vorpal.log(tabulate(data, ['Name']));
  };

const actionDeleteSecret =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const data = await secretsmanager.deleteSomSecret(AWS_REGION, args.name);
    state.spinner.stop();

    vorpal.log(tabulate(data, ['Name']));
  };

const actionListPublicKeys =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const keys = await iam.listPublicKeys(AWS_REGION, args.username);
    state.spinner.stop();

    vorpal.log(tabulate(keys, ['SSHPublicKeyId', 'Status', 'Remote']));
  };

const actionAddPublicKey =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const publicKey = await fs.promises.readFile(args.pathToPublicKeyFile);
    const keys = await iam.addPublicKey(AWS_REGION, args.username, publicKey.toString());
    state.spinner.stop();

    vorpal.log(tabulate(keys, ['SSHPublicKeyId', 'Status']));
  };

const actionDeletePublicKey =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    state.spinner.start();
    const keys = await iam.deletePublicKey(AWS_REGION, args.username, args.keyId);
    state.spinner.stop();

    vorpal.log(tabulate(keys, ['SSHPublicKeyId', 'Status']));
  };

const actionInfo =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    const STATE_INFO_KEYS: Array<keyof SomState> = ['pathToManifestFile', 'somId'];

    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    state.spinner.start();
    state.params = await ssm.getSsmParams(AWS_REGION, state.somId);
    state.status = await status.getStatus(state);
    state.verificationTxtRecord = await getSomTxtRecord(state.rootDomain);
    const connectionStatus = await getSiteConnectionStatus(state.siteUrl);
    if (state.registrar) {
      const registrarConnector = getRegistrarConnector(state.registrar);
      const somSecrets = await secretsmanager.getSomSecrets(AWS_REGION, registrarConnector.SECRETS);
      if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
        vorpal.log(`WARNING: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`);
      } else {
        state.registrarNameservers = await registrarConnector.getNameServers(somSecrets, state.rootDomain as string);
      }
    }

    state.spinner.stop();

    vorpal.log(
      tabulate(
        [
          { Param: chalk.bold('status'), Value: formatStatus(state.status) },
          { Param: chalk.bold('site'), Value: state.siteUrl },
          {
            Param: chalk.bold('connect'),
            Value: `${connectionStatus.statusCode}: ${connectionStatus.statusMessage} in ${connectionStatus.timing}ms`,
          },
          {
            Param: chalk.bold('pipelineType'),
            Value: state.manifest.pipelineType,
          },
          {
            Param: chalk.bold('registrar'),
            Value: state.registrar || '-',
          },
          {
            Param: chalk.bold('registrar nameservers'),
            Value: state.registrarNameservers || '-',
          },
          {
            Param: 'verification TXT',
            Value: state.verificationTxtRecord,
          },
          ...state.params,
          ...STATE_INFO_KEYS.reduce((acc, param) => {
            return acc.concat({ Param: param, Value: state[param] });
          }, [] as any),
        ],
        ['Param', 'Value']
      )
    );
  };

const actionDeploy =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    const response = await vorpal.activeCommand.prompt({
      type: 'input',
      name: 'confirm',
      message: chalk.green(
        `Are you sure you want to deploy site: ${chalk.bold(state.somId)} under user ${chalk.bold(
          args.username
        )}? [y/n] `
      ),
    });
    if (response.confirm === 'y') {
      await cdkExec.cdkDeploy(vorpal, state.pathToManifestFile, state.somId, args.username);
    } else {
      vorpal.log('Aborted');
    }
  };

const actionDestroy =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    const response = await vorpal.activeCommand.prompt({
      type: 'input',
      name: 'confirm',
      message: chalk.red(chalk.bold(`Are you sure you want to destroy site: ${state.somId}? [y/n] `)),
    });
    if (response.confirm === 'y') {
      await removeVerificationCnameRecord(AWS_REGION, getParam(state, 'hosted-zone-id') as string);
      await deleteAllPublicKeys(AWS_REGION, getParam(state, 'domain-user-name') as string);

      await cdkExec.cdkDestroy(vorpal, state.pathToManifestFile, state.somId);
    } else {
      vorpal.log('Aborted');
    }
  };

const actionSetNameServersWithRegistrar =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    if (!state.registrar) {
      vorpal.log('ERROR: no registrar specified in manifest');
      return;
    }
    state.spinner.start();
    const registrarConnector = getRegistrarConnector(state.registrar);
    const somSecrets = await secretsmanager.getSomSecrets(AWS_REGION, registrarConnector.SECRETS);
    if (!registrarConnector.SECRETS.every((secretName) => somSecrets[secretName])) {
      vorpal.log(`ERROR: secrets required by registrar connector missing: ${registrarConnector.SECRETS}`);
      return;
    }

    const nameservers = getParam(state, 'hosted-zone-name-servers')?.split(',');
    if (!nameservers || nameservers.length === 0) {
      vorpal.log('ERROR: missing nameservers, is the hosted zone deployed?');
      return;
    }

    const result = await registrarConnector.setNameServers(somSecrets, state.rootDomain as string, nameservers);
    state.spinner.stop();

    vorpal.log(`Set nameservers: ${result}`);
  };

// ----------------------------------------------------------------------
// MAIN
async function main() {
  AWS.config.update({ region: AWS_REGION });

  const vorpal = new Vorpal();
  const state: SomState = {
    spinner: ora(),
  };

  vorpal.delimiter('site-o-matic$');

  vorpal.command('clear', 'Clear the screen').alias('cls').action(actionClearScreen(vorpal, state));
  vorpal.command('load <pathToManifestFile>', 'Load a manifest file').action(actionLoadManifest(vorpal, state));
  vorpal.command('manifest', 'Show details of a loaded manifest').action(actionShowManifest(vorpal, state));
  vorpal.command('info', 'Show details about the site deployment').action(actionInfo(vorpal, state));

  vorpal.command('ls users', 'List users').action(actionListUsers(vorpal, state));
  vorpal.command('add user <username>', 'Add a user').action(actionAddUser(vorpal, state));

  vorpal.command('ls secrets', 'List secrets').action(actionListSecrets(vorpal, state));
  vorpal.command('add secret <name> <value>', 'Add a secret').action(actionAddSecret(vorpal, state));
  vorpal.command('del secret <name>', 'Delete a secret').action(actionDeleteSecret(vorpal, state));

  vorpal
    .command('ls keys <username>', 'List SSH public keys added for the given user')
    .action(actionListPublicKeys(vorpal, state));
  vorpal
    .command('add key <username> <pathToPublicKeyFile>', 'Add a SSH public key for the given user')
    .action(actionAddPublicKey(vorpal, state));
  vorpal
    .command('del key <username> <keyId>', 'Delete a SSH public key for the given user')
    .action(actionDeletePublicKey(vorpal, state));

  vorpal.command('deploy <username>', 'Deploy the site under the given user').action(actionDeploy(vorpal, state));
  vorpal
    .command('set nameservers', 'Set the nameservers automatically with the registrar, if configured')
    .action(actionSetNameServersWithRegistrar(vorpal, state));
  vorpal.command('destroy', 'Destroy the site').action(actionDestroy(vorpal, state));

  vorpal.show();
}

main().then(console.log).catch(console.error);
