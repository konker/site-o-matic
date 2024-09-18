import {
  ACMClient,
  CertificateStatus,
  ListCertificatesCommand,
  ListTagsForCertificateCommand,
} from '@aws-sdk/client-acm';
import type { Tag } from '@aws-sdk/client-acm/dist-types/models';

import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';

export async function listCertificateTags(
  _: SiteOMaticConfig,
  region: string,
  certificateArn: string
): Promise<Array<Tag>> {
  const client = new ACMClient({ region });

  const cmd1 = new ListTagsForCertificateCommand({
    CertificateArn: certificateArn,
  });
  const result = await client.send(cmd1);
  if (!result?.Tags) return [];

  return result.Tags;
}

export async function listSomCertificates(
  config: SiteOMaticConfig,
  region: string,
  SOM_TAG_NAME: string
): Promise<Array<Record<string, string>>> {
  const client = new ACMClient({ region });

  const cmd1 = new ListCertificatesCommand({
    CertificateStatuses: [CertificateStatus.ISSUED, CertificateStatus.PENDING_VALIDATION],
  });
  const result = await client.send(cmd1);
  if (!result?.CertificateSummaryList) return [];

  const certificateTags = await Promise.all(
    result.CertificateSummaryList.map(async ({ CertificateArn, DomainName }) => ({
      Arn: CertificateArn as string,
      Tags: await listCertificateTags(config, region, CertificateArn as string),
      DomainName: DomainName as string,
    }))
  );

  return certificateTags
    .filter(({ Tags }) => Tags?.find(({ Key }) => Key === SOM_TAG_NAME))
    .map(({ Arn, DomainName }) => ({ Arn, DomainName }));
}
