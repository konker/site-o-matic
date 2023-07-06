import os from 'os';
import path from 'path';

export function getTmpFilePath(somId: string, functionProducerId?: string | undefined): string | undefined {
  return functionProducerId ? path.join(os.tmpdir(), `${somId}-${functionProducerId}`) : undefined;
}
