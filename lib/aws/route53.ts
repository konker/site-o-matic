import {
  ChangeResourceRecordSetsCommand,
  ListHostedZonesByNameCommand,
  ListResourceRecordSetsCommand,
  Route53Client,
} from '@aws-sdk/client-route-53';

import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';
import type { SiteOMaticManifest } from '../manifest/schemas/site-o-matic-manifest.schema';
import type { HostedZoneAttributes } from '../types';
import { nsRecordValueToHost } from '../utils';
import { assumeSomRole } from './sts';

export async function findHostedZoneAttributes(
  config: SiteOMaticConfig,
  manifest: SiteOMaticManifest,
  domainName: string
): Promise<HostedZoneAttributes | undefined> {
  const somRoleCredentials = await assumeSomRole(config, manifest.region);
  const client = new Route53Client({
    region: manifest.region,
    credentials: somRoleCredentials,
  });
  try {
    const cmd1 = new ListHostedZonesByNameCommand({
      DNSName: domainName,
    });
    const result1 = await client.send(cmd1);
    if (result1.HostedZones) {
      // Find the first HostedZone with an SOA record
      for (const hostedZone of result1.HostedZones) {
        if (!hostedZone.Id || !hostedZone.Name) continue;
        if (!hostedZone.Name.startsWith(domainName)) continue;

        const soaRecords = await getRecordsForHostedZoneId(config, manifest, hostedZone.Id, 'SOA');
        if (soaRecords) {
          const bareHostedZoneId = parseHostedZoneId(hostedZone.Id);
          if (!bareHostedZoneId) continue;

          return {
            zoneName: hostedZone.Name,
            hostedZoneId: bareHostedZoneId,
          };
        }
      }
      return undefined;
    }
  } catch (ex) {
    console.log('FAILED: ', ex);
  }
  return undefined;
}

export async function removeVerificationCnameRecords(
  config: SiteOMaticConfig,
  region: string,
  hostedZoneId: string
): Promise<void> {
  if (!hostedZoneId) return;

  const somRoleCredentials = await assumeSomRole(config, region);
  const client = new Route53Client({
    region: region,
    credentials: somRoleCredentials,
  });
  try {
    const cmd1 = new ListResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
    });
    const result1 = await client.send(cmd1);
    const verificationRecords =
      result1.ResourceRecordSets?.filter((i) => {
        if (i.ResourceRecords && i.ResourceRecords.length > 0) {
          return i.ResourceRecords[0]?.Value?.endsWith('.acm-validations.aws.');
        }
        return false;
      }) ?? [];

    for (const verificationRecord of verificationRecords) {
      const cmd2 = new ChangeResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: 'DELETE',
              ResourceRecordSet: verificationRecord,
            },
          ],
        },
      });
      await client.send(cmd2);
    }
  } catch (ex) {
    console.log('FAILED: ', ex);
  }
}

export async function getRecordsForHostedZoneId(
  config: SiteOMaticConfig,
  manifest: SiteOMaticManifest,
  hostedZoneId: string,
  recordType: string
): Promise<Record<string, Array<string>> | undefined> {
  const somRoleCredentials = await assumeSomRole(config, manifest.region);
  const client = new Route53Client({
    region: manifest.region,
    credentials: somRoleCredentials,
  });
  try {
    const cmd1 = new ListResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
    });
    const result1 = await client.send(cmd1);
    const recordsOfType =
      result1.ResourceRecordSets?.filter((i) => {
        return i.Type === recordType;
      }) ?? [];

    return recordsOfType.reduce(
      (acc, i) => {
        const name = i.Name;
        if (!name) return acc;
        acc[nsRecordValueToHost(name)] = i.ResourceRecords?.map((j) => j.Value ?? '') ?? [];
        return acc;
      },
      {} as Record<string, Array<string>>
    );
  } catch (ex) {
    console.log('FAILED: ', ex);
  }
  return undefined;
}

export async function getRecordsForDomainName(
  config: SiteOMaticConfig,
  manifest: SiteOMaticManifest,
  domainName: string,
  recordType: string
): Promise<Record<string, Array<string>> | undefined> {
  const hostedZoneAttributes = await findHostedZoneAttributes(config, manifest, domainName);
  if (!hostedZoneAttributes) return undefined;

  return getRecordsForHostedZoneId(config, manifest, hostedZoneAttributes.hostedZoneId, recordType);
}

export async function getNsRecordValuesForDomainName(
  config: SiteOMaticConfig,
  manifest: SiteOMaticManifest,
  domainName: string
): Promise<Array<string> | undefined> {
  const ret = await getRecordsForDomainName(config, manifest, domainName, 'NS');
  return ret?.[domainName]?.map(nsRecordValueToHost);
}

export function parseHostedZoneId(hostedZoneId: string): string | undefined {
  if (!hostedZoneId.includes('/')) return hostedZoneId;

  const parts = hostedZoneId.split('/');
  if (parts.length === 0) return undefined;
  return parts[parts.length - 1];
}
