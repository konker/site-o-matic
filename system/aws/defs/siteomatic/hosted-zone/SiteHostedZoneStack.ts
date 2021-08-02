import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import * as ssm from '@aws-cdk/aws-ssm';
import { DnsConfigMx, SiteHostedZoneDnsConfig } from '../../../../../lib';
import { SiteHostedZoneProps, SOM_TAG_NAME, toSsmParamName } from '../common';
import { formulateStackName } from './lib';

export class SiteHostedZoneStack extends cdk.NestedStack {
  public readonly rootDomain: string;
  public readonly somId: string;
  public readonly extraDnsConfig?: Array<SiteHostedZoneDnsConfig>;

  public hostedZone: route53.PublicHostedZone;

  constructor(scope: cdk.Construct, props: SiteHostedZoneProps) {
    super(scope, formulateStackName(props.rootDomain));

    this.rootDomain = props.rootDomain;
    this.somId = props.somId;
    this.extraDnsConfig = props.extraDnsConfig;
  }

  async build() {
    cdk.Tags.of(this).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // DNS HostedZone
    this.hostedZone = new route53.PublicHostedZone(this, 'HostedZone', {
      zoneName: this.rootDomain,
    });
    // @ts-ignore
    cdk.Tags.of(this.hostedZone).add(SOM_TAG_NAME, this.somId);

    new route53.TxtRecord(this, 'DnsRecordSet_TXT_Som', {
      zone: this.hostedZone,
      recordName: '_som',
      values: [this.hostedZone.hostedZoneId.toString()],
    });

    if (this.extraDnsConfig) {
      const mxConfigs = this.extraDnsConfig.filter((i) => i.type === 'MX') as Array<DnsConfigMx>;

      if (mxConfigs.length > 0) {
        new route53.MxRecord(this, `DnsRecordSet_MX`, {
          zone: this.hostedZone,
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
                zone: this.hostedZone,
                recordName: dnsConfig.recordName,
                domainName: dnsConfig.domainName,
              }).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
              break;
            case 'TXT':
              new route53.TxtRecord(this, `DnsRecordSet_TXT_${i}`, {
                zone: this.hostedZone,
                recordName: dnsConfig.recordName,
                values: dnsConfig.values,
              }).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
              break;
            default:
              console.log(`WARNING: cannot handle extra dns config with type: ${dnsConfig.type}`);
          }
        });
    }

    // ----------------------------------------------------------------------
    // SSM Params
    new ssm.StringParameter(this, 'SSmHostedZoneId', {
      parameterName: toSsmParamName(this.somId, 'hosted-zone-id'),
      stringValue: this.hostedZone.hostedZoneId,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
    new ssm.StringParameter(this, 'SSmHostedZoneNameServers', {
      parameterName: toSsmParamName(this.somId, 'hosted-zone-name-servers'),
      stringValue: cdk.Fn.join(',', this.hostedZone.hostedZoneNameServers || []),
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
  }
}
