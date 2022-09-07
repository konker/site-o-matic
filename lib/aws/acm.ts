import {
  ACMClient,
  CertificateStatus,
  ListCertificatesCommand,
  ListTagsForCertificateCommand,
} from '@aws-sdk/client-acm';
import type { Tag } from '@aws-sdk/client-acm/dist-types/models';

import type { SomConfig } from '../consts';
import { SOM_TAG_NAME } from '../consts';

export async function listCertificateTags(_: SomConfig, region: string, certificateArn: string): Promise<Array<Tag>> {
  const client = new ACMClient({ region });

  const cmd1 = new ListTagsForCertificateCommand({
    CertificateArn: certificateArn,
  });
  const result = await client.send(cmd1);
  if (!result || !result.Tags) return [];

  return result.Tags;
}

export async function listSomCertificates(config: SomConfig, region: string): Promise<Array<Record<string, string>>> {
  const client = new ACMClient({ region });

  const cmd1 = new ListCertificatesCommand({
    CertificateStatuses: [CertificateStatus.ISSUED, CertificateStatus.PENDING_VALIDATION],
  });
  const result = await client.send(cmd1);
  if (!result || !result.CertificateSummaryList) return [];

  const certificateTags = await Promise.all(
    result.CertificateSummaryList.map(async ({ CertificateArn, DomainName }) => ({
      Arn: CertificateArn as string,
      Tags: await listCertificateTags(config, region, CertificateArn as string),
      DomainName: DomainName as string,
    }))
  );

  return certificateTags
    .filter(({ Tags }) => Tags && Tags.find(({ Key }) => Key === SOM_TAG_NAME))
    .map(({ Arn, DomainName }) => ({ Arn, DomainName }));
}
