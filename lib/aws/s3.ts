import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';
import type { SiteOMaticManifest } from '../manifest/schemas/site-o-matic-manifest.schema';

export async function getIsS3BucketEmpty(
  _config: SiteOMaticConfig,
  manifest: SiteOMaticManifest,
  bucketName: string
): Promise<boolean> {
  const client = new S3Client({ region: manifest.region });
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
