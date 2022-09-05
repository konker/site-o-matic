import {
  ChangeResourceRecordSetsCommand,
  ListHostedZonesByNameCommand,
  ListResourceRecordSetsCommand,
  Route53Client,
} from '@aws-sdk/client-route-53';
import { AWS_REGION, SomConfig } from '../consts';
import { assumeSomRole } from './sts';

export async function findHostedZoneId(config: SomConfig, domainName: string): Promise<string | undefined> {
  const somRoleCredentials = await assumeSomRole(config, AWS_REGION);
  const client = new Route53Client({ region: AWS_REGION, credentials: somRoleCredentials });
  try {
    const cmd1 = new ListHostedZonesByNameCommand({
      DNSName: domainName,
    });
    const result1 = await client.send(cmd1);
    if (result1.HostedZones) {
      return result1.HostedZones[0]?.Id;
    }
  } catch (ex) {
    console.log('FAILED: ', ex);
  }
  return undefined;
}

export async function removeVerificationCnameRecord(config: SomConfig, hostedZoneId: string): Promise<void> {
  if (!hostedZoneId) return;

  const somRoleCredentials = await assumeSomRole(config, AWS_REGION);
  const client = new Route53Client({ region: AWS_REGION, credentials: somRoleCredentials });
  try {
    const cmd1 = new ListResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
    });
    const result1 = await client.send(cmd1);
    const verificationRecord = result1.ResourceRecordSets?.find((i) => {
      if (i.ResourceRecords && i.ResourceRecords.length > 0) {
        return i.ResourceRecords[0].Value?.endsWith('.acm-validations.aws.');
      }
      return false;
    });

    if (verificationRecord) {
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
