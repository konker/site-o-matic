import type { SomManifest } from '../types';
import { getTmpDirPath, processContentDirectory } from './lib';
import * as default_ from './producers/default/manifest';

export const CONTENT_PRODUCER_ID_NONE = 'none';

export type SomContentProducer = {
  readonly ID: string;
  readonly TEMPLATE_DIR_PATH: string;
};

export type SomContentGenerator = (somId: string, manifest: SomManifest) => Promise<string | undefined>;

export const CONTENT_PRODUCER_IDS = [default_.ID] as const;

function createContentGenerator(contentProducer: SomContentProducer): SomContentGenerator {
  return async function generateContent(somId: string, manifest: SomManifest): Promise<string | undefined> {
    const tmpDirPath = getTmpDirPath(somId, contentProducer.ID);
    if (!tmpDirPath) {
      console.log(`ERROR: Could not generate content: Could not get tmp dir path`);
      return undefined;
    }

    const result = await processContentDirectory(somId, manifest, contentProducer.TEMPLATE_DIR_PATH, tmpDirPath);
    if (!result) {
      console.log(`ERROR: Could not generate content`);
      return undefined;
    }
    return tmpDirPath;
  };
}

export function getContentProducer(id: string | undefined): SomContentGenerator {
  switch (id?.toLowerCase()) {
    case CONTENT_PRODUCER_ID_NONE:
      return async function generateContent(): Promise<undefined> {
        return undefined;
      };
    case default_.ID:
    default:
      return createContentGenerator(default_);
  }
}
