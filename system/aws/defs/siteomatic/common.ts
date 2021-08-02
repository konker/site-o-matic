import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as route53 from '@aws-cdk/aws-route53';
import * as s3 from '@aws-cdk/aws-s3';
import { ContentPipelineType } from '../../../../content/index';
import { SiteHostedZoneDnsConfig } from '../../../../lib/index';

export const SOM_TAG_NAME = 'Site-o-Matic';

export const DEFAULT_STACK_PROPS: cdk.StackProps = {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
};

export interface SiteHostedZoneProps {
  somId: string;
  rootDomain: string;
  extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
}

export interface SiteHostingProps {
  somId: string;
  domainUser: iam.User;
  hostedZone: route53.PublicHostedZone;
}

export interface SitePipelineProps {
  somId: string;
  domainUser: iam.User;
  pipelineType: ContentPipelineType;
  domainBucket: s3.Bucket;
  cloudfrontDistributionId: string;
}

export function toSsmParamName(somId: string, name: string) {
  return `/som/${somId}/${name}`;
}
