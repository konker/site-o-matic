import { spawn } from 'child_process';
import Vorpal from 'vorpal';

async function cdkExec(vorpal: Vorpal, command: string, args: Array<string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd: __dirname });
    proc.stdout.on('data', (data: string) => {
      vorpal.log(data.toString());
    });

    proc.stderr.on('data', (data: string) => {
      vorpal.log(data.toString());
    });

    proc.on('close', (code: number) => {
      if (code === 0) resolve(code);
      else reject(code);
    });
  });
}

export async function cdkDeploy(
  vorpal: Vorpal,
  somId?: string,
  params: Record<string, string> | undefined = {}
): Promise<number> {
  if (!somId || !params.iamUsername) return 1;
  return cdkExec(
    vorpal,
    'npx',
    ['yarn', 'cdk', 'deploy', `${somId}`]
      .concat(['--context', `paramsKeys=${JSON.stringify(Object.keys(params))}`])
      .concat(...Object.entries(params).map(([k, v]) => ['---context', `${k}=${v}`]))
  );
}

export async function cdkDestroy(
  vorpal: Vorpal,
  pathToManifestFile?: string,
  somId?: string,
  iamUsername?: string
): Promise<number> {
  if (!somId) return 1;
  return cdkExec(vorpal, 'npx', [
    'yarn',
    'cdk',
    'destroy',
    `${somId}`,
    '--force',
    '--context',
    `pathToManifestFile=${pathToManifestFile}`,
    '--context',
    `iamUsername=${iamUsername}`,
  ]);
}
