import { spawn } from 'child_process';
import path from 'path';
import type Vorpal from 'vorpal';

import { sanitizeOutput } from '../sanitization';

export type CdkExecResponse = [number, Array<string>];

async function cdkExecProc(
  vorpal: Vorpal,
  command: string,
  args: Array<string>,
  plumbing = false
): Promise<CdkExecResponse> {
  const log: Array<string> = [];
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: path.join(__dirname, '..', '..'),
    });
    proc.stdout.on('data', (data: Buffer) => {
      const s = sanitizeOutput(data.toString('utf-8'));
      log.push(s);
      if (!plumbing) vorpal.log(s);
    });
    proc.stderr.on('data', (data: Buffer) => {
      const s = sanitizeOutput(data.toString('utf-8'));
      log.push(String(s));
      if (!plumbing) vorpal.log(String(s));
    });
    proc.on('close', (code: number) => {
      if (code === 0) resolve([code, log]);
      else reject([code, log]);
    });
  });
}

export async function cdkExec(
  vorpal: Vorpal,
  somId: string,
  region: string,
  params: Record<string, string>,
  plumbing: boolean,
  cdkCmd: string,
  stackName = '--all',
  extraArgs: Array<string> = []
): Promise<CdkExecResponse> {
  if (!somId) return [1, []];
  return cdkExecProc(
    vorpal,
    'npx',
    ['cdk', cdkCmd]
      .concat([stackName])
      .concat(extraArgs)
      .concat(['--strict'])
      .concat(['--ci'])
      .concat(['--no-color'])
      .concat(['--region', region])
      .concat(['--app', `npx node system/aws/bin/site-o-matic`])
      .concat(['--output', `system/aws/.cdk-${somId}.out`])
      .concat(['--context', `paramsKeys=${JSON.stringify(Object.keys(params))}`])
      .concat(...Object.entries(params).map(([k, v]) => ['--context', `${k}=${v}`])),
    plumbing
  );
}

export async function cdkList(
  vorpal: Vorpal,
  somId: string,
  region: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<CdkExecResponse> {
  return cdkExec(vorpal, somId, region, params, plumbing, 'list');
}

export async function cdkSynth(
  vorpal: Vorpal,
  somId: string,
  region: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<CdkExecResponse> {
  return cdkExec(vorpal, somId, region, params, plumbing, 'synth');
}

export async function cdkDiff(
  vorpal: Vorpal,
  region: string,
  somId: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<CdkExecResponse> {
  return cdkExec(vorpal, somId, region, params, plumbing, 'diff');
}

export async function cdkDeploy(
  vorpal: Vorpal,
  somId: string,
  region: string,
  params: Record<string, string> | undefined = {},
  plumbing = false,
  stackName?: string
): Promise<CdkExecResponse> {
  return cdkExec(vorpal, somId, region, params, plumbing, 'deploy', stackName);
}

export async function cdkDestroy(
  vorpal: Vorpal,
  somId: string,
  region: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<CdkExecResponse> {
  if (!somId) return [1, []];
  return cdkExec(vorpal, somId, region, params, plumbing, 'destroy', '--all', ['--force']);
}
