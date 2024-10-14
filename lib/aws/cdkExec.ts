import { spawn } from 'child_process';
import path from 'path';
import type Vorpal from 'vorpal';

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
    proc.stdout.on('data', (data: string) => {
      log.push(data.toString());
      if (!plumbing) vorpal.log(data.toString());
    });
    proc.stderr.on('data', (data: string) => {
      log.push(data.toString());
      if (!plumbing) vorpal.log(data.toString());
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
  params: Record<string, string>,
  plumbing: boolean,
  cdkCmd: string,
  extraArgs: Array<string> = []
): Promise<CdkExecResponse> {
  if (!somId || !params.iamUsername) return [1, []];
  return cdkExecProc(
    vorpal,
    'npx',
    ['cdk', cdkCmd /*,`${somId}*`*/]
      .concat(extraArgs)
      .concat(['--all'])
      .concat(['--strict'])
      .concat(['--ci', '--no-color'])
      .concat(['--app', `npx node system/aws/bin/site-o-matic`])
      .concat(['--output', `system/aws/.cdk-${somId}.out`])
      .concat(['--context', `paramsKeys=${JSON.stringify(Object.keys(params))}`])
      .concat(...Object.entries(params).map(([k, v]) => ['---context', `${k}=${v}`])),
    plumbing
  );
}

export async function cdkSynth(
  vorpal: Vorpal,
  somId: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<CdkExecResponse> {
  return cdkExec(vorpal, somId, params, plumbing, 'synth');
}

export async function cdkDiff(
  vorpal: Vorpal,
  somId: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<CdkExecResponse> {
  return cdkExec(vorpal, somId, params, plumbing, 'diff');
}

export async function cdkDeploy(
  vorpal: Vorpal,
  somId: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<CdkExecResponse> {
  return cdkExec(vorpal, somId, params, plumbing, 'deploy');
}

export async function cdkDestroy(
  vorpal: Vorpal,
  somId?: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<CdkExecResponse> {
  if (!somId) return [1, []];
  return cdkExec(vorpal, somId, params, plumbing, 'destroy', ['--force']);
}
