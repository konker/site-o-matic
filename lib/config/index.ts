/* eslint-disable @typescript-eslint/ban-ts-comment */
import { SOM_CONFIG_DEFAULT_SOM_PREFIX, SOM_CONFIG_DEFAULT_SOM_TAG_NAME } from '../consts';
import { loadValidData } from '../json5';
import type { SomConfig } from '../types';
import * as schema from './schemas/site-o-matic-config.schema.json';

export async function loadConfig(pathToConfig: string): Promise<SomConfig | undefined> {
  const validConfig = await loadValidData<SomConfig>(schema, pathToConfig);
  if (!validConfig) {
    return undefined;
  }

  // Apply defaults
  return {
    // @ts-ignore
    SOM_PREFIX: SOM_CONFIG_DEFAULT_SOM_PREFIX,
    // @ts-ignore
    SOM_TAG_NAME: SOM_CONFIG_DEFAULT_SOM_TAG_NAME,
    ...validConfig,
  };
}
