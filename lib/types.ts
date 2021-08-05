import * as route53 from '@aws-cdk/aws-route53';
import * as s3 from '@aws-cdk/aws-s3';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import { SITE_PIPELINE_TYPE_CODECOMMIT_NPM, SITE_PIPELINE_TYPE_CODECOMMIT_S3 } from './consts';

export type SitePipelineType = typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3 | typeof SITE_PIPELINE_TYPE_CODECOMMIT_NPM;

export interface DnsConfigMx {
  type: 'MX';
  hostName: string;
  priority: number;
}

export interface DnsConfigCname {
  type: 'CNAME';
  recordName: string;
  domainName: string;
}

export interface DnsConfigTxt {
  type: 'TXT';
  recordName: string;
  values: Array<string>;
}

export type SiteHostedZoneDnsConfig = DnsConfigMx | DnsConfigCname | DnsConfigTxt;

export interface SiteProps {
  rootDomain: string;
  webmasterEmail: string;
  username: string;
  contentProducerId: string;
  pipelineType: SitePipelineType;
  extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
  protected: boolean;
}

export interface SiteHostedZoneProps {
  extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
}

export interface HostedZoneStackResources {
  hostedZone: route53.PublicHostedZone;
}

export interface SiteHostingProps {}

export interface SiteHostingStackResources {
  domainCertificate: certificatemanager.ICertificate;
  domainBucket: s3.Bucket;
  originAccessIdentity: cloudfront.OriginAccessIdentity;
  cloudFrontDistribution: cloudfront.Distribution;
}

export interface SitePipelineProps {
  pipelineType: SitePipelineType;
}

export interface BaseSitePipelineResources {
  invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
}

export interface BaseCodecommitSitePipelineResources {
  invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  codeCommitRepo: codecommit.Repository;
}

export interface CodecommitS3SitePipelineResources {
  type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3;
  invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  codeCommitRepo: codecommit.Repository;
  codePipeline: codepipeline.Pipeline;
}

export interface CodecommitNpmSitePipelineResources {
  type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_NPM;
  invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  codeCommitRepo: codecommit.Repository;
  codePipeline: codepipeline.Pipeline;
}

export type SitePipelineResources = CodecommitS3SitePipelineResources | CodecommitNpmSitePipelineResources;

export function toSsmParamName(somId: string, name: string) {
  return `/som/${somId}/${name}`;
}
