import * as route53 from 'aws-cdk-lib/aws-route53';

import type { DnsConfigMx } from '../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import { _id, _somMeta } from '../../../../lib/utils';
import type { SiteResourcesStack } from './SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type ExtraDnsResources = Array<route53.RecordSet>;

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesStack): Promise<ExtraDnsResources> {
  const hostedZone = siteResourcesStack.hostedZoneResources?.hostedZone;
  if (!hostedZone) {
    throw new Error('[site-o-matic] Could not build extra DNS resources when hostedZone is missing');
  }
  if (
    !siteResourcesStack.siteProps.context.manifest.extraDnsConfig ||
    siteResourcesStack.siteProps.context.manifest.extraDnsConfig.length == 0
  ) {
    return [];
  }

  const mxRecords: Array<route53.MxRecord> = (() => {
    const mxConfigs = siteResourcesStack.siteProps.context.manifest.extraDnsConfig.filter(
      (i) => i.type === 'MX'
    ) as Array<DnsConfigMx>;

    if (mxConfigs.length > 0) {
      const res = new route53.MxRecord(siteResourcesStack, _id('DnsRecordSet_MX', siteResourcesStack.rootDomainName), {
        zone: hostedZone,
        values: mxConfigs.map((i: DnsConfigMx) => ({
          hostName: i.hostName,
          priority: i.priority,
        })),
      });
      _somMeta(siteResourcesStack.siteProps.config, res, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);
      return [res];
    }
    return [];
  })();

  const otherRecords: Array<route53.RecordSet> = siteResourcesStack.siteProps.context.manifest.extraDnsConfig
    .filter((i) => i.type !== 'MX')
    .map((dnsConfig, i) => {
      switch (dnsConfig.type) {
        case 'CNAME':
          const res1 = new route53.CnameRecord(
            siteResourcesStack,
            _id(`DnsRecordSet_CNAME_${i}`, siteResourcesStack.rootDomainName),
            {
              zone: hostedZone,
              recordName: dnsConfig.recordName,
              domainName: dnsConfig.domainName,
            }
          );
          _somMeta(
            siteResourcesStack.siteProps.config,
            res1,
            siteResourcesStack.somId,
            siteResourcesStack.siteProps.locked
          );
          return res1;
        case 'TXT':
          const res2 = new route53.TxtRecord(
            siteResourcesStack,
            _id(`DnsRecordSet_TXT_${i}`, siteResourcesStack.rootDomainName),
            {
              zone: hostedZone,
              recordName: dnsConfig.recordName,
              values: dnsConfig.values,
            }
          );
          _somMeta(
            siteResourcesStack.siteProps.config,
            res2,
            siteResourcesStack.somId,
            siteResourcesStack.siteProps.locked
          );
          return res2;
      }
    });

  return [...mxRecords, ...otherRecords];
}
