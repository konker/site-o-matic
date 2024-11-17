import type { ExecProcResponse } from './proc';
import { execProc } from './proc';

export async function awsCliS3CpDirectory(from: string, to: string, plumbing = false): Promise<ExecProcResponse> {
  return execProc(console.log, 'pnpm', ['aws', 's3', 'cp'].concat('--recursive').concat(from).concat(to), plumbing);
}
