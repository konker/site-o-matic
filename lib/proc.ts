import { exec, spawn } from 'node:child_process';

import path from 'path';

import { sanitizeOutput } from './sanitization';

export type ExecProcResponse = [number, Array<string>];

// ----------------------------------------------------------------------
export async function spawnProc(
  logFn: (s: string) => void,
  command: string,
  args: Array<string>,
  plumbing = false,
  params: Record<string, string> = {}
): Promise<ExecProcResponse> {
  const log: Array<string> = [];
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: path.join(__dirname, '..'),
      env: {
        CI: 'true',
        ...process.env,
        ...params,
        paramKeys: JSON.stringify(Object.keys(params)),
      },
    });
    proc.stdout.on('data', (data: Buffer) => {
      const s = sanitizeOutput(data.toString('utf-8'));
      log.push(s);
      if (!plumbing) logFn(s);
    });
    proc.stderr.on('data', (data: Buffer) => {
      const s = sanitizeOutput(data.toString('utf-8'));
      log.push(String(s));
      if (!plumbing) logFn(String(s));
    });
    proc.on('close', (code: number) => {
      if (code === 0) resolve([code, log]);
      else reject([code, log]);
    });
  });
}

// ----------------------------------------------------------------------
export async function execProc(
  logFn: (s: string) => void,
  command: string,
  args: Array<string>,
  plumbing = false,
  params: Record<string, string> = {}
): Promise<ExecProcResponse> {
  const log: Array<string> = [];
  return new Promise((resolve, reject) => {
    exec(
      `${command} ${args.join(' ')}`,
      {
        cwd: path.join(__dirname, '..'),
        env: {
          CI: 'true',
          ...process.env,
          ...params,
          paramKeys: JSON.stringify(Object.keys(params)),
        },
      },
      (err, stdout, stderr) => {
        if (stdout) {
          const s = sanitizeOutput(stdout);
          log.push(s);
          if (!plumbing) logFn(s);
        }
        if (stderr) {
          const s = sanitizeOutput(stderr);
          log.push(s);
          if (!plumbing) logFn(s);
        }
        if (err?.code === 0) resolve([err.code, log]);
        else if (err?.code && err.code > 0) reject([err?.code, log]);
      }
    );
  });
}
