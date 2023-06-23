import type { SomManifest } from '../types';
import { getTmpDirPath, processContentDirectory } from './lib';
import * as default_ from './producers/default';
import * as metalsmithDefault from './producers/metalsmith-default';

export type SomContentProducer = {
  readonly ID: string;
  readonly TEMPLATE_DIR_PATH: string;
};

export type SomContentGenerator = (somId: string, manifest: SomManifest) => Promise<string | undefined>;

export const CONTENT_PRODUCER_IDS = [default_.ID, metalsmithDefault.ID] as const;

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

export function getContentProducer(id: string): SomContentGenerator {
  switch (id) {
    case default_.ID:
      return createContentGenerator(default_);
    case metalsmithDefault.ID:
      return createContentGenerator(metalsmithDefault);
    default:
      throw new Error(`Could not get ContentProducer for ${id}`);
  }
}
