import { Route53Record } from '@cdktf/provider-aws/lib/route53-record';
import { Route53Zone } from '@cdktf/provider-aws/lib/route53-zone';
import { SsmParameter } from '@cdktf/provider-aws/lib/ssm-parameter';
import { Fn } from 'cdktf';

import { findHostedZoneAttributes } from '../../../../lib/aws/route53';
import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  REGISTRAR_ID_AWS_ROUTE53,
  SSM_PARAM_NAME_HOSTED_ZONE_ID,
  SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS,
  SSM_PARAM_NAME_IS_AWS_ROUTE53_REGISTERED_DOMAIN,
} from '../../../../lib/consts';
import { _id, _somTags } from '../../../../lib/utils';
import type { SiteStack } from './SiteStack';

// ----------------------------------------------------------------------
export type HostedZoneResources = {
  readonly hostedZone: Route53Zone;
  readonly verificationRecord: Route53Record;
  readonly ssmParams: Array<SsmParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteStack: SiteStack): Promise<HostedZoneResources> {
  if (!siteStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build hosted zone resources when domainUser is missing');
  }

  // Try to detect if an existing HostedZone exists with an SOA record
  const hostedZoneAttributes = await findHostedZoneAttributes(
    siteStack.siteProps.config,
    siteStack.siteProps.context.manifest,
    siteStack.siteProps.context.rootDomainName
  );

  // Special case for AWS Route53 registrar, as we expect this to be automatically created when the domain is registered
  if (siteStack.siteProps.context.manifest.registrar === REGISTRAR_ID_AWS_ROUTE53) {
    if (!hostedZoneAttributes?.name || !hostedZoneAttributes.zoneId) {
      throw new Error(`[site-o-matic] Could not resolve existing hosted zone for AWS Route53 registered domain`);
    }
  }

  // ----------------------------------------------------------------------
  // DNS HostedZone
  const hostedZone = new Route53Zone(
    siteStack,
    _id('HostedZone', siteStack.siteProps.context.rootDomainName),
    hostedZoneAttributes
      ? {
          ...hostedZoneAttributes,
          provider: siteStack.providerManifestRegion,
          tags: _somTags(siteStack),
        }
      : {
          name: siteStack.siteProps.context.rootDomainName,
          provider: siteStack.providerManifestRegion,
          tags: _somTags(siteStack),
        }
  );

  // ----------------------------------------------------------------------
  // Internal validation resource
  const verificationRecord = new Route53Record(siteStack, 'DnsRecordSet_TXT_Som', {
    type: 'TXT',
    zoneId: hostedZone.zoneId,
    name: '_som',
    records: [hostedZone.zoneId.toString()],
    ttl: 300,
    provider: siteStack.providerManifestRegion,
  });

  // ----------------------------------------------------------------------
  // SSM Params, only create for the top level
  const ssm1 = new SsmParameter(siteStack, _id('SsmHostedZoneId', siteStack.siteProps.context.rootDomainName), {
    type: 'String',
    name: toSsmParamName(siteStack.siteProps.config, siteStack.siteProps.context.somId, SSM_PARAM_NAME_HOSTED_ZONE_ID),
    value: hostedZone.zoneId,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  const ssm2 = new SsmParameter(
    siteStack,
    _id('SsmHostedZoneNameServers', siteStack.siteProps.context.rootDomainName),
    {
      type: 'String',
      name: toSsmParamName(
        siteStack.siteProps.config,
        siteStack.siteProps.context.somId,
        SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS
      ),
      value: Fn.join(',', hostedZone.nameServers ?? []),
      provider: siteStack.providerManifestRegion,
      tags: _somTags(siteStack),
    }
  );
  _somTags(siteStack);

  const ssm3 = new SsmParameter(
    siteStack,
    _id('SsmIsAwsRoute53RegisteredDomain', siteStack.siteProps.context.rootDomainName),
    {
      type: 'String',
      name: toSsmParamName(
        siteStack.siteProps.config,
        siteStack.siteProps.context.somId,
        SSM_PARAM_NAME_IS_AWS_ROUTE53_REGISTERED_DOMAIN
      ),
      value: siteStack.siteProps.context.manifest.registrar === REGISTRAR_ID_AWS_ROUTE53 ? 'true' : 'false',
      provider: siteStack.providerManifestRegion,
      tags: _somTags(siteStack),
    }
  );

  return {
    hostedZone,
    verificationRecord,
    ssmParams: [ssm1, ssm2, ssm3],
  };
}
