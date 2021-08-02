import * as crypto from 'crypto';
import { ContentPipelineType } from '../content';

export const SOM_PREFIX = 'som';
export const MAX_SOM_ID_LEN = 48;

export interface DnsConfigMx {
  type: 'MX';
  hostName: string;
  priority: number;
}

export interface DnsConfigCname {
  type: 'CNAME';
  recordName: string;
  domainName: string;
}

export interface DnsConfigTxt {
  type: 'TXT';
  recordName: string;
  values: Array<string>;
}

export type SiteHostedZoneDnsConfig = DnsConfigMx | DnsConfigCname | DnsConfigTxt;

export interface SiteProps {
  rootDomain: string;
  webmasterEmail: string;
  contentProducerId: string;
  pipelineType: ContentPipelineType;
  extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
  protected: boolean;
}

export function calculateDomainHash(domainName: string) {
  return crypto.createHash('md5').update(domainName).digest('hex').slice(0, 6);
}

export function normalizeDomainName(domainName: string, reservedLength: number): string {
  return domainName.replace('.', '-dot-').slice(0, MAX_SOM_ID_LEN - reservedLength);
}

export function formulateSomId(domainName: string): string {
  const domain_name_hash = calculateDomainHash(domainName);
  const normalized_domain_name = normalizeDomainName(domainName, SOM_PREFIX.length + domain_name_hash.length + 4);

  return `${SOM_PREFIX}--${normalized_domain_name}--${domain_name_hash}`;
}
