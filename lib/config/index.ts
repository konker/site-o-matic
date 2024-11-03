import { loadValidData } from '../json5';
import { SiteOMaticConfig } from './schemas/site-o-matic-config.schema';

export type ConfigLoad = [SiteOMaticConfig, string];

export async function loadConfig(pathToConfig: string): Promise<ConfigLoad | undefined> {
  return loadValidData(pathToConfig, SiteOMaticConfig);
}
