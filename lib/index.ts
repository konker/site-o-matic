export interface SomSiteParams {
  rootDomain: string;
  webmasterEmail: string;
  contentProducerId: string;
}

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

export type SomSiteHostedZoneDnsConfig = DnsConfigMx | DnsConfigCname | DnsConfigTxt;

export interface SomSiteHostedZoneParams {
  rootDomain: string;
  extraDnsConfig: Array<SomSiteHostedZoneDnsConfig>;
}
