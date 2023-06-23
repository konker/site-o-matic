import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import { SSM_PARAM_NAME_HOSTED_ZONE_ID } from '../../../../../lib/consts';
import type {
  DnsConfigMx,
  HostedZoneBuilderProps,
  HostedZoneConfig,
  HostedZoneResources,
} from '../../../../../lib/types';
import { _id, _somMeta } from '../../../../../lib/utils';
import type { SiteStack } from '../site/SiteStack';

export function buildCrossAccountAccess(hostedZonesPolicy: iam.Policy, hostedZone: route53.PublicHostedZone) {
  hostedZonesPolicy.addStatements(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [hostedZone.hostedZoneArn],
      actions: ['route53:ListResourceRecordSets', 'route53:ChangeResourceRecordSets'],
    })
  );
}

export function buildExtraDnsConfig(
  scope: Construct,
  siteStack: SiteStack,
  props: HostedZoneConfig,
  hostedZone: route53.PublicHostedZone,
  isRoot: boolean
) {
  if (props.extraDnsConfig) {
    const mxConfigs = props.extraDnsConfig.filter((i) => i.type === 'MX') as Array<DnsConfigMx>;

    if (mxConfigs.length > 0) {
      const res = new route53.MxRecord(scope, _id('DnsRecordSet_MX', props.domainName, isRoot), {
        zone: hostedZone,
        values: mxConfigs.map((i: DnsConfigMx) => ({
          hostName: i.hostName,
          priority: i.priority,
        })),
      });
      _somMeta(res, siteStack.somId, siteStack.siteProps.protected);
    }

    props.extraDnsConfig
      .filter((i) => i.type !== 'MX')
      .forEach((dnsConfig, i) => {
        switch (dnsConfig.type) {
          case 'CNAME':
            const res1 = new route53.CnameRecord(scope, _id(`DnsRecordSet_CNAME_${i}`, props.domainName, isRoot), {
              zone: hostedZone,
              recordName: dnsConfig.recordName,
              domainName: dnsConfig.domainName,
            });
            _somMeta(res1, siteStack.somId, siteStack.siteProps.protected);
            break;
          case 'TXT':
            const res2 = new route53.TxtRecord(scope, _id(`DnsRecordSet_TXT_${i}`, props.domainName, isRoot), {
              zone: hostedZone,
              recordName: dnsConfig.recordName,
              values: dnsConfig.values,
            });
            _somMeta(res2, siteStack.somId, siteStack.siteProps.protected);
            break;
          default:
            console.log(`WARNING: cannot handle extra dns config with type: ${dnsConfig.type}`);
        }
      });
  }
}

export async function build(scope: Construct, props: HostedZoneBuilderProps): Promise<HostedZoneResources> {
  if (!props.siteStack.domainPolicy) {
    throw new Error(`[site-o-matic] Could not build hosted zone sub-stack when domainPolicy is missing`);
  }

  // ----------------------------------------------------------------------
  // Add basic list permissions to the domain policy
  props.siteStack.domainPolicy.addStatements(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'], //[FIXME: tighten with conditions clause which specifies ARN?]
      actions: ['route53:ListHostedZones', 'route53:GetHostedZoneCount', 'route53:ListHostedZonesByName'],
    })
  );

  // ----------------------------------------------------------------------
  // DNS HostedZone
  const hostedZone = new route53.PublicHostedZone(scope, 'HostedZone', {
    zoneName: props.domainName,
  });
  _somMeta(hostedZone, props.siteStack.somId, props.siteStack.siteProps.protected);

  const txtRecord = new route53.TxtRecord(scope, 'DnsRecordSet_TXT_Som', {
    zone: hostedZone,
    recordName: '_som',
    values: [hostedZone.hostedZoneId.toString()],
  });
  _somMeta(txtRecord, props.siteStack.somId, props.siteStack.siteProps.protected);

  buildExtraDnsConfig(scope, props.siteStack, props, hostedZone, true);
  buildCrossAccountAccess(props.siteStack.domainPolicy, hostedZone);

  // ----------------------------------------------------------------------
  // Provision subdomains
  props.subdomains?.forEach((subdomain: HostedZoneConfig) => {
    // Build any extra DNS entries for the subdomain
    buildExtraDnsConfig(scope, props.siteStack, subdomain, hostedZone, false);
    buildCrossAccountAccess(props.siteStack.domainPolicy as iam.Policy, hostedZone);
  });

  // ----------------------------------------------------------------------
  // SSM Params
  const res1 = new ssm.StringParameter(scope, 'SsmHostedZoneId', {
    parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_HOSTED_ZONE_ID),
    stringValue: hostedZone.hostedZoneId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res1, props.siteStack.somId, props.siteStack.siteProps.protected);

  const res2 = new ssm.StringParameter(scope, 'SsmHostedZoneNameServers', {
    parameterName: toSsmParamName(props.siteStack.somId, 'hosted-zone-name-servers'),
    stringValue: cdk.Fn.join(',', hostedZone.hostedZoneNameServers || []),
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(res2, props.siteStack.somId, props.siteStack.siteProps.protected);

  // ----------------------------------------------------------------------
  // Returned resources
  return {
    hostedZone,
  };
}
