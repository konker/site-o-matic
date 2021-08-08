import got from 'got';

export const ID = 'dynadot';
export const SECRETS = ['DYNADOT_API_KEY'];

const OK = 'ok,';
const SUCCESS = 'success';

const API_ENDPOINT = 'https://api.dynadot.com/api2.html';

export async function getNameServers(secrets: { [key: string]: string }, domain: string): Promise<Array<string>> {
  const apiUrl = `${API_ENDPOINT}?key=${secrets.DYNADOT_API_KEY}&command=get_ns&domain=${domain}`;
  const result = await got.get(apiUrl);

  const data = result.body.split('\n');
  if (data[0] !== OK) throw new Error(data[1]);

  const nameservers = data[2].split(',');
  if (nameservers[0] !== SUCCESS) return [];

  return nameservers.slice(1, -1).filter(Boolean);
}

export async function setNameServers(
  secrets: { [key: string]: string },
  domain: string,
  hosts: Array<string>
): Promise<Array<string>> {
  const hostsForUrl = hosts.map((host, i) => `ns${i}=${host}`).join('&');
  const apiUrl = `${API_ENDPOINT}?key=${secrets.DYNADOT_API_KEY}&command=set_ns&domain=${domain}&${hostsForUrl}`;
  const result = await got.get(apiUrl);

  const data = result.body.split('\n');
  if (data[0] !== OK) throw new Error(data[1]);

  return getNameServers(secrets, domain);
}
