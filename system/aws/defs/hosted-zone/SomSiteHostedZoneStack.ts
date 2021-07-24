import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import { DEFAULT_STACK_PROPS, SOM_TAG_NAME } from '../common';
import { DnsConfigMx, SomSiteHostedZoneDnsConfig, SomSiteHostedZoneParams } from '../../../../lib';
import { formulateStackName } from './lib';

export class SomSiteHostedZoneStack extends cdk.Stack {
  public rootDomain: string;
  public somId: string;
  public extraDnsConfig?: Array<SomSiteHostedZoneDnsConfig>;

  constructor(scope: cdk.Construct, params: SomSiteHostedZoneParams) {
    super(scope, formulateStackName(params.rootDomain), DEFAULT_STACK_PROPS);

    this.rootDomain = params.rootDomain;
    this.somId = formulateStackName(params.rootDomain);
    this.extraDnsConfig = params.extraDnsConfig;
  }

  async build() {
    cdk.Tags.of(this).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // DNS HostedZone
    const HostedZone = new route53.PublicHostedZone(this, 'HostedZone', {
      zoneName: this.rootDomain,
    });
    // @ts-ignore
    cdk.Tags.of(HostedZone).add(SOM_TAG_NAME, this.somId);

    new route53.TxtRecord(this, 'DnsRecordSet_TXT_Som', {
      zone: HostedZone,
      recordName: '_som',
      values: [HostedZone.hostedZoneId.toString()],
    });

    if (this.extraDnsConfig) {
      const mxConfigs = this.extraDnsConfig.filter((i) => i.type === 'MX') as Array<DnsConfigMx>;

      if (mxConfigs.length > 0) {
        new route53.MxRecord(this, `DnsRecordSet_MX`, {
          zone: HostedZone,
          values: mxConfigs.map((i: DnsConfigMx) => ({
            hostName: i.hostName,
            priority: i.priority,
          })),
        }).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
      }

      this.extraDnsConfig
        .filter((i) => i.type !== 'MX')
        .forEach((dnsConfig, i) => {
          switch (dnsConfig.type) {
            case 'CNAME':
              new route53.CnameRecord(this, `DnsRecordSet_CNAME_${i}`, {
                zone: HostedZone,
                recordName: dnsConfig.recordName,
                domainName: dnsConfig.domainName,
              }).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
              break;
            case 'TXT':
              new route53.TxtRecord(this, `DnsRecordSet_TXT_${i}`, {
                zone: HostedZone,
                recordName: dnsConfig.recordName,
                values: dnsConfig.values,
              }).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
              break;
            default:
              console.log(`WARNING: cannot handle extra dns config with type: ${dnsConfig.type}`);
          }
        });
    }

    new cdk.CfnOutput(this, 'OutputHostedZoneId', {
      description: 'Route53 Hosted Zone ID',
      value: HostedZone.hostedZoneId,
    });
    new cdk.CfnOutput(this, 'OutputHostedZoneNameServers', {
      description: 'Route53 Hosted Zone NameServers',
      value: cdk.Fn.join(',', HostedZone.hostedZoneNameServers || []),
    });
  }
}
