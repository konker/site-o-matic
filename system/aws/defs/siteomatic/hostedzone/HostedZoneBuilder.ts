import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import { findHostedZoneAttributes } from '../../../../../lib/aws/route53';
import { toSsmParamName } from '../../../../../lib/aws/ssm';
import {
  REGISTRAR_ID_AWS_ROUTE53,
  SSM_PARAM_NAME_HOSTED_ZONE_ID,
  SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS,
} from '../../../../../lib/consts';
import * as awsRoute53Registrar from '../../../../../lib/registrar/connectors/aws-route53';
import type {
  DnsConfigMx,
  HostedZoneBuilderProps,
  HostedZoneConfig,
  HostedZoneResources,
  SomConfig,
} from '../../../../../lib/types';
import { _id, _somMeta } from '../../../../../lib/utils';
import type { SiteStack } from '../site/SiteStack';

export function buildCrossAccountAccess(hostedZonesPolicy: iam.Policy, hostedZone: route53.IHostedZone) {
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
  props: HostedZoneBuilderProps,
  hostedZoneConfig: HostedZoneConfig,
  hostedZone: route53.IHostedZone
) {
  const isRoot = hostedZoneConfig.domainName === props.rootDomainName;

  if (hostedZoneConfig.extraDnsConfig) {
    const mxConfigs = hostedZoneConfig.extraDnsConfig.filter((i) => i.type === 'MX') as Array<DnsConfigMx>;

    if (mxConfigs.length > 0) {
      const res = new route53.MxRecord(scope, _id('DnsRecordSet_MX', hostedZoneConfig.domainName, isRoot), {
        zone: hostedZone,
        values: mxConfigs.map((i: DnsConfigMx) => ({
          hostName: i.hostName,
          priority: i.priority,
        })),
      });
      _somMeta(siteStack.config, res, siteStack.somId, siteStack.siteProps.protected);
    }

    hostedZoneConfig.extraDnsConfig
      .filter((i) => i.type !== 'MX')
      .forEach((dnsConfig, i) => {
        switch (dnsConfig.type) {
          case 'CNAME':
            const res1 = new route53.CnameRecord(
              scope,
              _id(`DnsRecordSet_CNAME_${i}`, hostedZoneConfig.domainName, isRoot),
              {
                zone: hostedZone,
                recordName: dnsConfig.recordName,
                domainName: dnsConfig.domainName,
              }
            );
            _somMeta(siteStack.config, res1, siteStack.somId, siteStack.siteProps.protected);
            break;
          case 'TXT':
            const res2 = new route53.TxtRecord(
              scope,
              _id(`DnsRecordSet_TXT_${i}`, hostedZoneConfig.domainName, isRoot),
              {
                zone: hostedZone,
                recordName: dnsConfig.recordName,
                values: dnsConfig.values,
              }
            );
            _somMeta(siteStack.config, res2, siteStack.somId, siteStack.siteProps.protected);
            break;
          default:
            console.log(`WARNING: cannot handle extra dns config with type: ${dnsConfig.type}`);
        }
      });
  }
}

export async function build(
  scope: Construct,
  config: SomConfig,
  props: HostedZoneBuilderProps,
  hostedZoneConfig: HostedZoneConfig,
  parentHostedZone?: route53.IHostedZone
): Promise<HostedZoneResources> {
  if (!props.siteStack.domainPolicy) {
    throw new Error(`[site-o-matic] Could not build hosted zone sub-stack when domainPolicy is missing`);
  }
  console.log(`\t\t⮡ Building HostedZone for ${hostedZoneConfig.domainName}`);

  const isRoot = hostedZoneConfig.domainName === props.rootDomainName;

  // ----------------------------------------------------------------------
  // DNS HostedZone
  const hostedZone =
    parentHostedZone ??
    (await (async () => {
      // Try to detect if an existing HostedZone exists with an SOA record
      const hostedZoneAttributes = await findHostedZoneAttributes(config, props.rootDomainName);

      // Special case for AWS Route53 registrar, as we expect this to be automatically created when the domain is registered
      if (props.siteStack.siteProps.context.manifest.registrar === REGISTRAR_ID_AWS_ROUTE53) {
        if (!hostedZoneAttributes?.zoneName || !hostedZoneAttributes.hostedZoneId) {
          throw new Error(`[site-o-matic] Could not resolve existing hosted zone for AWS Route53 registered domain`);
        }
      }

      // This determines whether we create a new HostedZone or use an existing one
      if (hostedZoneAttributes) {
        const ret = route53.HostedZone.fromHostedZoneAttributes(scope, 'ExistingHostedZone', hostedZoneAttributes);
        if (!ret.hostedZoneNameServers) {
          // Polyfill in the nameservers, clobber readonly attribute with any keyword
          // Only because CDK doesn't instantiate this fully via fromHostedZoneAttributes
          (ret as any).hostedZoneNameServers = await awsRoute53Registrar.getNameServers(
            props.siteStack.config,
            {},
            props.rootDomainName
          );
        }

        return ret;
      } else {
        const ret = new route53.PublicHostedZone(scope, 'HostedZone', {
          zoneName: props.rootDomainName,
        });
        _somMeta(config, ret, props.siteStack.somId, props.siteStack.siteProps.protected);
        return ret;
      }
    })());

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
  // Internal validation resource
  if (isRoot) {
    const txtRecord = new route53.TxtRecord(scope, 'DnsRecordSet_TXT_Som', {
      zone: hostedZone,
      recordName: '_som',
      values: [hostedZone.hostedZoneId.toString()],
    });
    _somMeta(config, txtRecord, props.siteStack.somId, props.siteStack.siteProps.protected);
  }

  // ----------------------------------------------------------------------
  // Extra optional resources
  buildExtraDnsConfig(scope, props.siteStack, props, hostedZoneConfig, hostedZone);
  buildCrossAccountAccess(props.siteStack.domainPolicy, hostedZone);

  // ----------------------------------------------------------------------
  // Recurse to provision subdomain HostedZones
  for (const subdomain of hostedZoneConfig.subdomains ?? []) {
    await build(scope, config, props, subdomain, hostedZone);
  }

  // ----------------------------------------------------------------------
  // SSM Params, only create for the top level
  if (isRoot) {
    const res1 = new ssm.StringParameter(scope, 'SsmHostedZoneId', {
      parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_HOSTED_ZONE_ID),
      stringValue: hostedZone.hostedZoneId,
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(config, res1, props.siteStack.somId, props.siteStack.siteProps.protected);

    const res2 = new ssm.StringParameter(scope, 'SsmHostedZoneNameServers', {
      parameterName: toSsmParamName(props.siteStack.somId, SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS),
      stringValue: cdk.Fn.join(',', hostedZone.hostedZoneNameServers ?? []),
      tier: ssm.ParameterTier.STANDARD,
    });
    _somMeta(config, res2, props.siteStack.somId, props.siteStack.siteProps.protected);
  }

  // ----------------------------------------------------------------------
  // Returned resources
  return {
    hostedZone,
  };
}
