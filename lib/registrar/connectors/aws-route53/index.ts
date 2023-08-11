import { getNsRecordValuesForDomainName } from '../../../aws/route53';
import type { SomConfig } from '../../../types';

export const ID = 'aws-route53';
export const SECRETS = [];

export async function getNameServers(
  config: SomConfig,
  _secrets: { [key: string]: string },
  domain: string
): Promise<Array<string>> {
  // if the registrar is aws-route53 then this is where the nameservers are (right?)
  const ret = await getNsRecordValuesForDomainName(config, domain);
  return ret ?? [];
}

export async function setNameServers(
  config: SomConfig,
  secrets: { [key: string]: string },
  domain: string,
  _hosts: Array<string>
): Promise<Array<string> | undefined> {
  // As far as we know at the moment, this is a NOOP?
  // Could use UpdateDomainNameserversCommand to update the nameservers.
  // Which would potentially apply if the domain was transferred, e.g. AWS-Route53 -> Dynadot
  //  however, then the registrar would be dynadot, and this would not apply.
  return getNameServers(config, secrets, domain);
}
