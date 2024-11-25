import { XMLParser } from 'fast-xml-parser';
import got from 'got';

import type { SiteOMaticConfig } from '../../../config/schemas/site-o-matic-config.schema';
import type { SiteOMaticManifest } from '../../../manifest/schemas/site-o-matic-manifest.schema';
import type { SecretsSetCollection } from '../../../secrets/types';

export const ID = 'dynadot';
export const SECRETS = ['DYNADOT_API_KEY'];

const SUCCESS = 'success';

const API_ENDPOINT = 'https://api.dynadot.com/api3.xml';
const XML_PARSER = new XMLParser();

export async function getNameServers(
  _config: SiteOMaticConfig,
  _manifest: SiteOMaticManifest,
  secrets: SecretsSetCollection,
  domain: string
): Promise<Array<string>> {
  try {
    const apiUrl = `${API_ENDPOINT}?key=${secrets.lookup.DYNADOT_API_KEY}&command=get_ns&domain=${domain}`;
    const result = await got.get(apiUrl);

    const data = XML_PARSER.parse(result.body);
    if (data?.GetNsResponse?.GetNsHeader?.Status !== SUCCESS) {
      console.log('[registrar/dynadot] ERROR: ', data);
      return [];
    }

    return data.GetNsResponse.NsContent.Host;
  } catch (ex) {
    console.log(`[registrar/dynadot] ERROR: ${ex}`);
    return [];
  }
}

export async function setNameServers(
  config: SiteOMaticConfig,
  manifest: SiteOMaticManifest,
  secrets: SecretsSetCollection,
  domain: string,
  hosts: Array<string>
): Promise<Array<string> | undefined> {
  try {
    const hostsForUrl = hosts.map((host, i) => `ns${i}=${host}`).join('&');
    const apiUrl = `${API_ENDPOINT}?key=${secrets.lookup.DYNADOT_API_KEY}&command=set_ns&domain=${domain}&${hostsForUrl}`;
    const result = await got.get(apiUrl);

    const data = XML_PARSER.parse(result.body);
    if (data?.SetNsResponse?.SetNsHeader?.Status !== SUCCESS) {
      console.log('[registrar/dynadot] ERROR: ', data);
      return undefined;
    }

    return getNameServers(config, manifest, secrets, domain);
  } catch (ex) {
    console.log(`[registrar/dynadot] ERROR: ${ex}`);
    return undefined;
  }
}
