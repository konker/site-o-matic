import path from 'node:path';

import type Vorpal from 'vorpal';

import { SOM_SYSTEM_DIR_NAME } from './consts';
import type { ExecProcResponse } from './proc';
import { spawnProc } from './proc';

export async function cdkExec(
  vorpal: Vorpal,
  somId: string,
  params: Record<string, string>,
  plumbing: boolean,
  cdkCmd: string,
  _stackName = '--all',
  extraArgs: Array<string> = []
): Promise<ExecProcResponse> {
  if (!somId) return [1, []];

  const appPath = path.join(__dirname, '..', 'system', 'aws', 'bin', 'site-o-matic');
  const outputDirPath = path.join(__dirname, '..', SOM_SYSTEM_DIR_NAME, `cdk-${somId}.out`);
  const outputsFilePath = path.join(__dirname, '..', SOM_SYSTEM_DIR_NAME, `cdk-${somId}.out`, 'outputs.json');

  return spawnProc(
    (s) => vorpal.log(s),
    'pnpm',
    ['cdktf', cdkCmd]
      .concat(extraArgs)
      .concat(['--app', `npx node ${appPath}`])
      .concat(['--output', outputDirPath])
      .concat(['--outputs-file', outputsFilePath])
      .concat(['--auto-approve'])
      .concat(['--no-color']),
    plumbing,
    { ...params, cdkCommand: cdkCmd }
  );
}

export async function cdkList(
  vorpal: Vorpal,
  somId: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<ExecProcResponse> {
  return cdkExec(vorpal, somId, params, plumbing, 'list');
}

export async function cdkSynth(
  vorpal: Vorpal,
  somId: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<ExecProcResponse> {
  return cdkExec(vorpal, somId, params, plumbing, 'synth');
}

export async function cdkDiff(
  vorpal: Vorpal,
  somId: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<ExecProcResponse> {
  return cdkExec(vorpal, somId, params, plumbing, 'diff');
}

export async function cdkPlan(
  vorpal: Vorpal,
  somId: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<ExecProcResponse> {
  return cdkExec(vorpal, somId, params, plumbing, 'plan');
}

export async function cdkDeploy(
  vorpal: Vorpal,
  somId: string,
  params: Record<string, string> | undefined = {},
  plumbing = false,
  stackName?: string
): Promise<ExecProcResponse> {
  return cdkExec(vorpal, somId, params, plumbing, 'deploy', stackName);
}

export async function cdkDestroy(
  vorpal: Vorpal,
  somId: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<ExecProcResponse> {
  if (!somId) return [1, []];
  return cdkExec(vorpal, somId, params, plumbing, 'destroy', '--all', ['--force']);
}
