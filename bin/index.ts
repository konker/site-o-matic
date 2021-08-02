import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import Vorpal from 'vorpal';
import chalk from 'chalk';
import * as AWS from 'aws-sdk';
import { formulateSomId } from '../lib';
import { tabulate } from './lib/tables';
import * as cdkExec from './lib/cdkExec';
import * as ssm from './lib/ssm';
import * as iam from './lib/iam';
import * as status from './lib/status';
import { AWS_REGION, CLS, SomState } from '../lib/consts';
import { getParam } from './lib/utils';
import { formatStatus, getSomTxtRecord } from './lib/status';
import { removeVerificationCnameRecord } from './lib/route53';
import { deleteAllPublicKeys } from './lib/iam';
import { getSiteConnectionStatus } from './lib/http';

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

const actionListPublicKeys =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    const keys = await iam.listPublicKeys(AWS_REGION, getParam(state, 'domain-user-name') as string);

    vorpal.log(tabulate(keys, ['SSHPublicKeyId', 'Status', 'Remote']));
  };

const actionAddPublicKey =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    const publicKey = await fs.promises.readFile(args.pathToPublicKeyFile);
    const keys = await iam.addPublicKey(
      AWS_REGION,
      getParam(state, 'domain-user-name') as string,
      publicKey.toString()
    );

    vorpal.log(tabulate(keys, ['SSHPublicKeyId', 'Status']));
  };

const actionDeletePublicKey =
  (vorpal: Vorpal, state: SomState) =>
  async (args: Vorpal.Args): Promise<void> => {
    if (!state.manifest) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    const keys = await iam.deletePublicKey(AWS_REGION, getParam(state, 'domain-user-name') as string, args.keyId);

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

    state.params = await ssm.getSsmParams(AWS_REGION, state.somId);
    state.status = await status.getStatus(state);
    state.verificationTxtRecord = await getSomTxtRecord(state.rootDomain);
    const connectionStatus = await getSiteConnectionStatus(state.siteUrl);
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
      message: chalk.green(`Are you sure you want to deploy site: ${state.somId}? [y/n] `),
    });
    if (response.confirm === 'y') {
      await cdkExec.cdkDeploy(vorpal, state.pathToManifestFile, state.somId);
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

// ----------------------------------------------------------------------
// MAIN
async function main() {
  AWS.config.update({ region: AWS_REGION });

  const vorpal = new Vorpal();
  const state: SomState = {};

  vorpal.delimiter('site-o-matic$');

  vorpal.command('clear', 'Clear the screen').alias('cls').action(actionClearScreen(vorpal, state));
  vorpal.command('load <pathToManifestFile>', 'Load a manifest file').action(actionLoadManifest(vorpal, state));
  vorpal.command('manifest', 'Show details of a loaded manifest').action(actionShowManifest(vorpal, state));
  vorpal.command('ls keys', 'List public keys added').action(actionListPublicKeys(vorpal, state));
  vorpal.command('add key <pathToPublicKeyFile>', 'Add a public key').action(actionAddPublicKey(vorpal, state));
  vorpal.command('del key <keyId>', 'Delete a public key').action(actionDeletePublicKey(vorpal, state));
  vorpal.command('deploy', 'Deploy the site').action(actionDeploy(vorpal, state));
  vorpal.command('destroy', 'Destroy the site').action(actionDestroy(vorpal, state));
  vorpal.command('info', 'Show details about the site deployment').action(actionInfo(vorpal, state));

  vorpal.show();
}

main().then(console.log).catch(console.error);
