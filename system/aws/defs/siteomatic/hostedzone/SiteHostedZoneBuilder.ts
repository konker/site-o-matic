import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import * as ssm from '@aws-cdk/aws-ssm';
import {
  DnsConfigMx,
  HostedZoneConfig,
  HostedZoneStackResources,
  SiteHostedZoneProps,
  toSsmParamName,
} from '../../../../../lib/types';
import { SiteStack } from '../site/SiteStack';
import { Tags } from '@aws-cdk/core';
import { SOM_TAG_NAME } from '../../../../../lib/consts';
import { _id } from '../../../../../lib/utils';

export function buildExtraDnsConfig(
  siteStack: SiteStack,
  props: HostedZoneConfig,
  hostedZone: route53.PublicHostedZone,
  isRoot: boolean
) {
  if (props.extraDnsConfig) {
    const mxConfigs = props.extraDnsConfig.filter((i) => i.type === 'MX') as Array<DnsConfigMx>;

    if (mxConfigs.length > 0) {
      new route53.MxRecord(siteStack, _id('DnsRecordSet_MX', props.domainName, isRoot), {
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
            new route53.CnameRecord(siteStack, _id(`DnsRecordSet_CNAME_${i}`, props.domainName, isRoot), {
              zone: hostedZone,
              recordName: dnsConfig.recordName,
              domainName: dnsConfig.domainName,
            }).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
            break;
          case 'TXT':
            new route53.TxtRecord(siteStack, _id(`DnsRecordSet_TXT_${i}`, props.domainName, isRoot), {
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
}

export function build(siteStack: SiteStack, props: SiteHostedZoneProps): HostedZoneStackResources {
  // ----------------------------------------------------------------------
  // DNS HostedZone
  const hostedZone = new route53.PublicHostedZone(siteStack, _id('HostedZone', props.domainName, true), {
    zoneName: props.domainName,
  });
  Tags.of(hostedZone).add(SOM_TAG_NAME, siteStack.somId);

  new route53.TxtRecord(siteStack, _id('DnsRecordSet_TXT_Som', props.domainName, true), {
    zone: hostedZone,
    recordName: '_som',
    values: [hostedZone.hostedZoneId.toString()],
  });

  buildExtraDnsConfig(siteStack, props, hostedZone, true);

  // ----------------------------------------------------------------------
  // Provision subdomains
  props.subdomains?.forEach((subdomain: HostedZoneConfig) => {
    // Create the hosted zone for the subdomain
    const subdomainHostedZone = new route53.PublicHostedZone(
      siteStack,
      _id('HostedZone', subdomain.domainName, false),
      {
        zoneName: subdomain.domainName,
      }
    );
    Tags.of(subdomainHostedZone).add(SOM_TAG_NAME, siteStack.somId);

    // Add an NS record to the root domain for this subdomain
    new route53.NsRecord(siteStack, _id('NsRecordSet_TXT_Som', subdomain.domainName, false), {
      zone: hostedZone,
      recordName: subdomain.domainName,
      values: subdomainHostedZone.hostedZoneNameServers ?? [],
    });

    // Build any extra DNS entries for the subdomain
    buildExtraDnsConfig(siteStack, subdomain, subdomainHostedZone, false);

    siteStack.subdomainHostedZoneResources[subdomain.domainName] = {
      hostedZone: subdomainHostedZone,
    };
  });

  // ----------------------------------------------------------------------
  // SSM Params
  new ssm.StringParameter(siteStack, _id('SsmHostedZoneId', props.domainName, true), {
    parameterName: toSsmParamName(siteStack.somId, _id('hosted-zone-id', props.domainName, true)),
    stringValue: hostedZone.hostedZoneId,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.STANDARD,
  });
  new ssm.StringParameter(siteStack, _id('SsmHostedZoneNameServers', props.domainName, true), {
    parameterName: toSsmParamName(siteStack.somId, _id('hosted-zone-name-servers', props.domainName, true)),
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
