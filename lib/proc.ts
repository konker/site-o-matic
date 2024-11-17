import { spawn } from 'child_process';
import path from 'path';

import { sanitizeOutput } from './sanitization';

export type ExecProcResponse = [number, Array<string>];

export async function execProc(
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
