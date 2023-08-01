import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

import { DEFAULT_AWS_REGION } from '../consts';
import type { SomConfig } from '../types';
import { assumeSomRole } from './sts';

export async function getIsS3BucketEmpty(config: SomConfig, bucketName: string): Promise<boolean> {
  const somRoleCredentials = await assumeSomRole(config, DEFAULT_AWS_REGION);
  const client = new S3Client({
    credentials: somRoleCredentials,
  });
  const cmd1 = new ListObjectsV2Command({
    Bucket: bucketName,
    MaxKeys: 1,
  });
  const resp1 = await client.send(cmd1);

  return resp1.KeyCount === 0;
}
