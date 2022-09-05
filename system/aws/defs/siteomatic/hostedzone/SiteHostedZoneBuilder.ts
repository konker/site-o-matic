import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import {
  DnsConfigMx,
  HostedZoneConfig,
  HostedZoneStackResources,
  SiteHostedZoneProps,
  toSsmParamName,
} from '../../../../../lib/types';
import { SiteStack } from '../site/SiteStack';
import { SOM_TAG_NAME } from '../../../../../lib/consts';
import { _id } from '../../../../../lib/utils';

export function buildCrossAccountAccess(
  siteStack: SiteStack,
  hostedZonesPolicy: iam.Policy,
  hostedZone: route53.PublicHostedZone
) {
  hostedZonesPolicy.addStatements(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [hostedZone.hostedZoneArn],
      actions: ['route53:ListResourceRecordSets', 'route53:ChangeResourceRecordSets'],
    })
  );
}

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
  // Add basic list permissions to the domain policy
  siteStack.domainPolicy.addStatements(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'], //[FIXME: tighten with conditions clause which specifies ARN?]
      actions: ['route53:ListHostedZones', 'route53:GetHostedZoneCount', 'route53:ListHostedZonesByName'],
    })
  );

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
  buildCrossAccountAccess(siteStack, siteStack.domainPolicy, hostedZone);

  // ----------------------------------------------------------------------
  // Provision subdomains
  props.subdomains?.forEach((subdomain: HostedZoneConfig) => {
    // Build any extra DNS entries for the subdomain
    buildExtraDnsConfig(siteStack, subdomain, hostedZone, false);
    buildCrossAccountAccess(siteStack, siteStack.domainPolicy, hostedZone);
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
