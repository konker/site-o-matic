/* eslint-disable @typescript-eslint/ban-ts-comment */
import configFile from '../site-o-matic.config.json';
import { CONFIG_DEFAULT_SOM_PREFIX, CONFIG_DEFAULT_SOM_TAG_NAME } from './consts';
import type { SomConfig } from './types';

export function getConfig(): SomConfig {
  return {
    // @ts-ignore
    SOM_PREFIX: CONFIG_DEFAULT_SOM_PREFIX,
    // @ts-ignore
    SOM_TAG_NAME: CONFIG_DEFAULT_SOM_TAG_NAME,
    ...configFile,
  };
}
