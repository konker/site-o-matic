import os from 'os';
import path from 'path';

import type { SomFunctionFragmentProducerDef } from './index';

export function getTmpFilePath(somId: string, functionProducerId: string, postfix: string): string {
  return path.join(os.tmpdir(), `${somId}-${functionProducerId}-${postfix}`);
}

export async function undefinedFunctionProducerExec(): Promise<string | undefined> {
  return undefined;
}

export function noopSubComponentIdSorter<T, C extends SomFunctionFragmentProducerDef<T>>(
  subComponentIds: Array<C>
): Array<C> {
  return subComponentIds;
}
