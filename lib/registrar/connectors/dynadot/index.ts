import { XMLParser } from 'fast-xml-parser';
import got from 'got';

export const ID = 'dynadot';
export const SECRETS = ['DYNADOT_API_KEY'];

const SUCCESS = 'success';

const API_ENDPOINT = 'https://api.dynadot.com/api3.xml';
const XML_PARSER = new XMLParser();

export async function getNameServers(
  secrets: { [key: string]: string },
  domain: string
): Promise<Array<string> | undefined> {
  try {
    const apiUrl = `${API_ENDPOINT}?key=${secrets.DYNADOT_API_KEY}&command=get_ns&domain=${domain}`;
    const result = await got.get(apiUrl);

    const data = XML_PARSER.parse(result.body);
    if (data?.GetNsResponse?.GetNsHeader?.Status !== SUCCESS) {
      console.log(data[1]);
      return undefined;
    }

    return data.GetNsResponse.NsContent.Host;
  } catch (ex) {
    console.log(`[registrar/dynadot] ERROR: ${ex}`);
    return undefined;
  }
}

export async function setNameServers(
  secrets: { [key: string]: string },
  domain: string,
  hosts: Array<string>
): Promise<Array<string> | undefined> {
  try {
    const hostsForUrl = hosts.map((host, i) => `ns${i}=${host}`).join('&');
    const apiUrl = `${API_ENDPOINT}?key=${secrets.DYNADOT_API_KEY}&command=set_ns&domain=${domain}&${hostsForUrl}`;
    const result = await got.get(apiUrl);

    const data = XML_PARSER.parse(result.body);
    if (data?.SetNsResponse?.SetNsHeader?.Status !== SUCCESS) {
      console.log(data[1]);
      return undefined;
    }

    return getNameServers(secrets, domain);
  } catch (ex) {
    console.log(`[registrar/dynadot] ERROR: ${ex}`);
    return undefined;
  }
}
