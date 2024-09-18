/* eslint-disable @typescript-eslint/ban-ts-comment */
import { loadValidData } from '../json5';
import { SiteOMaticConfig } from './schemas/site-o-matic-config.schema';

export async function loadConfig(pathToConfig: string): Promise<SiteOMaticConfig | undefined> {
  return loadValidData(pathToConfig, SiteOMaticConfig);
}
