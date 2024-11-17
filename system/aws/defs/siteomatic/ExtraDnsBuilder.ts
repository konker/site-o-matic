import { Route53Record } from '@cdktf/provider-aws/lib/route53-record';

import type { DnsConfigMx } from '../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import { _id, _somTags } from '../../../../lib/utils';
import type { SiteStack } from './SiteStack';

// ----------------------------------------------------------------------
export type ExtraDnsResources = Array<Route53Record>;

// ----------------------------------------------------------------------
export async function build(siteStack: SiteStack): Promise<ExtraDnsResources> {
  const hostedZone = siteStack.hostedZoneResources?.hostedZone;
  if (!hostedZone) {
    throw new Error('[site-o-matic] Could not build extra DNS resources when hostedZone is missing');
  }
  if (
    !siteStack.siteProps.context.manifest.extraDnsConfig ||
    siteStack.siteProps.context.manifest.extraDnsConfig.length == 0
  ) {
    return [];
  }

  const mxRecords: Array<Route53Record> = (() => {
    const mxConfigs = siteStack.siteProps.context.manifest.extraDnsConfig.filter(
      (i) => i.type === 'MX'
    ) as Array<DnsConfigMx>;

    if (mxConfigs.length > 0) {
      const res = new Route53Record(siteStack, _id('DnsRecordSet_MX', siteStack.siteProps.context.rootDomainName), {
        type: 'MX',
        zoneId: hostedZone.zoneId,
        name: siteStack.siteProps.context.rootDomainName,
        records: mxConfigs.map((i: DnsConfigMx) => `${i.priority} ${i.hostName}`),
        ttl: 300,
        provider: siteStack.providerManifestRegion,
      });
      return [res];
    }
    return [];
  })();

  const otherRecords: Array<Route53Record> = siteStack.siteProps.context.manifest.extraDnsConfig
    .filter((i) => i.type !== 'MX')
    .map((dnsConfig, i) => {
      switch (dnsConfig.type) {
        case 'CNAME':
          const res1 = new Route53Record(
            siteStack,
            _id(`DnsRecordSet_CNAME_${i}`, siteStack.siteProps.context.rootDomainName),
            {
              type: 'CNAME',
              zoneId: hostedZone.zoneId,
              name: dnsConfig.recordName,
              records: [dnsConfig.domainName],
              ttl: 300,
              provider: siteStack.providerManifestRegion,
            }
          );
          return res1;
        case 'TXT':
          const res2 = new Route53Record(
            siteStack,
            _id(`DnsRecordSet_TXT_${i}`, siteStack.siteProps.context.rootDomainName),
            {
              type: 'TXT',
              zoneId: hostedZone.zoneId,
              name: dnsConfig.recordName,
              records: dnsConfig.values,
              ttl: 300,
              provider: siteStack.providerManifestRegion,
            }
          );
          return res2;
      }
    });

  return [...mxRecords, ...otherRecords];
}
