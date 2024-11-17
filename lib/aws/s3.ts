import { HeadBucketCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';

export async function getIsS3BucketEmpty(
  _config: SiteOMaticConfig,
  region: string,
  bucketName: string
): Promise<boolean> {
  const client = new S3Client({ region });
  const cmd1 = new ListObjectsV2Command({
    Bucket: bucketName,
    MaxKeys: 1,
  });

  try {
    const resp1 = await client.send(cmd1);
    return resp1.KeyCount === 0;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404) {
      // If there is NoSuchBucket, we can assume that it's empty
      return true;
    }

    // If some other error occurred, assume the bucket is not empty for safety
    return false;
  }
}

export async function getDoesBucketExist(
  _config: SiteOMaticConfig,
  region: string,
  bucketName: string
): Promise<boolean> {
  const client = new S3Client({ region });
  const cmd1 = new HeadBucketCommand({
    Bucket: bucketName,
  });

  try {
    await client.send(cmd1);
    return true;
  } catch (err: any) {
    return false;
  }
}
