import { ContentPipelineType } from '../content';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';

export interface SomSiteProps {
  rootDomain: string;
  webmasterEmail: string;
  contentProducerId: string;
  protected: boolean;
}

export interface SomPipelineProps {
  domainUser: iam.User;
  type: ContentPipelineType;
  contentBucket: s3.Bucket;
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

export interface SomSiteHostedZoneProps {
  rootDomain: string;
  extraDnsConfig: Array<SomSiteHostedZoneDnsConfig>;
}
