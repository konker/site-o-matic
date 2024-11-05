import type { Reference } from 'aws-cdk-lib';
import type { OriginBindConfig, OriginBindOptions } from 'aws-cdk-lib/aws-cloudfront';
import type { S3OriginProps } from 'aws-cdk-lib/aws-cloudfront-origins';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import type { IBucket } from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

export type S3OriginWithOACPatchProps = S3OriginProps & {
  oacId: Reference;
};

/**
 * From: https://github.com/aws/aws-cdk/issues/21771
 */
export class S3OriginWithOACPatch extends S3BucketOrigin {
  private readonly oacId: Reference;

  constructor(bucket: IBucket, props: S3OriginWithOACPatchProps) {
    super(bucket, props);
    this.oacId = props.oacId;
  }

  public override bind(scope: Construct, options: OriginBindOptions): OriginBindConfig {
    const originConfig = super.bind(scope, options);

    if (!originConfig.originProperty) throw new Error('originProperty is required');

    return {
      ...originConfig,
      originProperty: {
        ...originConfig.originProperty,
        originAccessControlId: this.oacId.toString(), // Adds OAC to  S3 origin config
        s3OriginConfig: {
          ...originConfig.originProperty.s3OriginConfig,
          originAccessIdentity: '', // removes OAI from S3 origin config
        },
      },
    };
  }
}
