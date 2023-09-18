import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import type * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

/**
 * Throws an error if a duration is defined and not an integer number of seconds within a range.
 */
export function validateSecondsInRangeOrUndefined(name: string, min: number, max: number, duration?: cdk.Duration) {
  if (duration === undefined) {
    return;
  }
  const value = duration.toSeconds();
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name}: Must be an int between ${min} and ${max} seconds (inclusive); received ${value}.`);
  }
}

/**
 * Properties for an Origin for an API Gateway REST API which already exists, and has been sourced via RestApi.fromRestApiId().
 */
export type ExistingRestApiOriginProps = {
  /**
   * Specifies how long, in seconds, CloudFront waits for a response from the origin, also known as the origin response timeout.
   * The valid range is from 1 to 180 seconds, inclusive.
   *
   * Note that values over 60 seconds are possible only after a limit increase request for the origin response timeout quota
   * has been approved in the target account; otherwise, values over 60 seconds will produce an error at deploy time.
   *
   * @default Duration.seconds(30)
   */
  readonly readTimeout?: cdk.Duration;

  /**
   * Specifies how long, in seconds, CloudFront persists its connection to the origin.
   * The valid range is from 1 to 180 seconds, inclusive.
   *
   * Note that values over 60 seconds are possible only after a limit increase request for the origin response timeout quota
   * has been approved in the target account; otherwise, values over 60 seconds will produce an error at deploy time.
   *
   * @default Duration.seconds(5)
   */
  readonly keepaliveTimeout?: cdk.Duration;
} & cloudfront.OriginProps;

/**
 * An Origin for an API Gateway REST API.
 */
export class ExistingRestApiOrigin extends cloudfront.OriginBase {
  constructor(
    restApiUrl: string,
    private readonly props: origins.RestApiOriginProps = {}
  ) {
    // urlForPath() is of the form 'https://<rest-api-id>.execute-api.<region>.amazonaws.com/<stage>'
    // Splitting on '/' gives: ['https', '', '<rest-api-id>.execute-api.<region>.amazonaws.com', '<stage>']
    // The element at index 2 is the domain name, the element at index 3 is the stage name
    super(cdk.Fn.select(2, cdk.Fn.split('/', restApiUrl)), {
      originPath: props.originPath ?? `/${cdk.Fn.select(3, cdk.Fn.split('/', restApiUrl))}`,
      ...props,
    });

    validateSecondsInRangeOrUndefined('readTimeout', 1, 180, props.readTimeout);
    validateSecondsInRangeOrUndefined('keepaliveTimeout', 1, 180, props.keepaliveTimeout);
  }

  protected override renderCustomOriginConfig(): cloudfront.CfnDistribution.CustomOriginConfigProperty | undefined {
    return Object.assign(
      {
        originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
        originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      },
      this.props.readTimeout ? { originReadTimeout: this.props.readTimeout.toSeconds() } : {},
      this.props.keepaliveTimeout ? { originKeepaliveTimeout: this.props.keepaliveTimeout.toSeconds() } : {}
    );
  }
}
