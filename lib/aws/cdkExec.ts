import { spawn } from 'child_process';
import path from 'path';
import type Vorpal from 'vorpal';

async function cdkExec(
  vorpal: Vorpal,
  command: string,
  args: Array<string>,
  plumbing = false
): Promise<[number, Array<string>]> {
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

export async function cdkSynth(
  vorpal: Vorpal,
  somId?: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<[number, Array<string>]> {
  if (!somId || !params.iamUsername) return [1, []];
  return cdkExec(
    vorpal,
    'npx',
    ['cdk', 'synth', `${somId}*`]
      .concat(['--output', `system/aws/.cdk-${somId}.out`])
      .concat(['--context', `paramsKeys=${JSON.stringify(Object.keys(params))}`])
      .concat(...Object.entries(params).map(([k, v]) => ['---context', `${k}=${v}`])),
    plumbing
  );
}

export async function cdkDeploy(
  vorpal: Vorpal,
  somId?: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<[number, Array<string>]> {
  if (!somId || !params.iamUsername) return [1, []];
  return cdkExec(
    vorpal,
    'npx',
    ['cdk', 'deploy', `${somId}*`]
      .concat(['--output', `system/aws/.cdk-${somId}.out`])
      .concat(['--context', `paramsKeys=${JSON.stringify(Object.keys(params))}`])
      .concat(...Object.entries(params).map(([k, v]) => ['---context', `${k}=${v}`])),
    plumbing
  );
}

export async function cdkDestroy(
  vorpal: Vorpal,
  somId?: string,
  params: Record<string, string> | undefined = {},
  plumbing = false
): Promise<[number, Array<string>]> {
  if (!somId) return [1, []];
  return cdkExec(
    vorpal,
    'npx',
    ['cdk', 'destroy', `${somId}*`, '--force']
      .concat(['--output', `system/aws/.cdk-${somId}.out`])
      .concat(['--context', `paramsKeys=${JSON.stringify(Object.keys(params))}`])
      .concat(...Object.entries(params).map(([k, v]) => ['---context', `${k}=${v}`])),
    plumbing
  );
}
