import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import * as ssm from '@aws-cdk/aws-ssm';
import { DnsConfigMx, HostedZoneStackResources, SiteHostedZoneProps, toSsmParamName } from '../../../../../lib/types';
import { SiteStack } from '../site/SiteStack';
import { Tags } from '@aws-cdk/core';
import { SOM_TAG_NAME } from '../../../../../lib/consts';

export async function build(siteStack: SiteStack, props: SiteHostedZoneProps): Promise<HostedZoneStackResources> {
  // ----------------------------------------------------------------------
  // DNS HostedZone
  const hostedZone = new route53.PublicHostedZone(siteStack, 'HostedZone', {
    zoneName: siteStack.siteProps.rootDomain,
  });
  Tags.of(hostedZone).add(SOM_TAG_NAME, siteStack.somId);

  new route53.TxtRecord(siteStack, 'DnsRecordSet_TXT_Som', {
    zone: hostedZone,
    recordName: '_som',
    values: [hostedZone.hostedZoneId.toString()],
  });

  if (props.extraDnsConfig) {
    const mxConfigs = props.extraDnsConfig.filter((i) => i.type === 'MX') as Array<DnsConfigMx>;

    if (mxConfigs.length > 0) {
      new route53.MxRecord(siteStack, `DnsRecordSet_MX`, {
        zone: hostedZone,
        values: mxConfigs.map((i: DnsConfigMx) => ({
          hostName: i.hostName,
          priority: i.priority,
        })),
      }).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }

    props.extraDnsConfig
      .filter((i) => i.type !== 'MX')
      .forEach((dnsConfig, i) => {
        switch (dnsConfig.type) {
          case 'CNAME':
            new route53.CnameRecord(siteStack, `DnsRecordSet_CNAME_${i}`, {
              zone: hostedZone,
              recordName: dnsConfig.recordName,
              domainName: dnsConfig.domainName,
            }).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
            break;
          case 'TXT':
            new route53.TxtRecord(siteStack, `DnsRecordSet_TXT_${i}`, {
              zone: hostedZone,
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
  new ssm.StringParameter(siteStack, 'SsmHostedZoneId', {
    parameterName: toSsmParamName(siteStack.somId, 'hosted-zone-id'),
    stringValue: hostedZone.hostedZoneId,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });
  new ssm.StringParameter(siteStack, 'SsmHostedZoneNameServers', {
    parameterName: toSsmParamName(siteStack.somId, 'hosted-zone-name-servers'),
    stringValue: cdk.Fn.join(',', hostedZone.hostedZoneNameServers || []),
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });

  // ----------------------------------------------------------------------
  // Returned resources
  return {
    hostedZone,
  };
}
