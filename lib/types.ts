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
  readonly type: 'MX';
  readonly hostName: string;
  readonly priority: number;
}

export interface DnsConfigCname {
  readonly type: 'CNAME';
  readonly recordName: string;
  readonly domainName: string;
}

export interface DnsConfigTxt {
  readonly type: 'TXT';
  readonly recordName: string;
  readonly values: Array<string>;
}

export type SiteHostedZoneDnsConfig = DnsConfigMx | DnsConfigCname | DnsConfigTxt;

export interface HostedZoneConfig {
  readonly domainName: string;
  readonly extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
}

export interface SiteHostedZoneProps {
  readonly domainName: string;
  readonly extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
  readonly subdomains?: Array<HostedZoneConfig>;
}

export interface SiteProps {
  readonly rootDomain: string;
  readonly webmasterEmail: string;
  readonly username: string;
  readonly contentProducerId: string;
  readonly pipelineType: SitePipelineType;
  readonly extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
  readonly subdomains?: Array<HostedZoneConfig>;
  readonly protected: boolean;
  readonly contextParams: Record<string, string>;
}

export interface HostedZoneStackResources {
  readonly hostedZone: route53.PublicHostedZone;
}

export interface SiteHostingProps {}

export interface SiteHostingStackResources {
  readonly domainCertificate: certificatemanager.ICertificate;
  readonly domainBucket: s3.Bucket;
  readonly originAccessIdentity: cloudfront.OriginAccessIdentity;
  readonly cloudFrontDistribution: cloudfront.Distribution;
}

export interface SitePipelineProps {
  readonly pipelineType: SitePipelineType;
}

export interface BaseSitePipelineResources {
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
}

export interface BaseCodecommitSitePipelineResources {
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  readonly codeCommitRepo: codecommit.Repository;
}

export interface CodecommitS3SitePipelineResources {
  readonly type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3;
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  readonly codeCommitRepo: codecommit.Repository;
  readonly codePipeline: codepipeline.Pipeline;
}

export interface CodecommitNpmSitePipelineResources {
  readonly type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_NPM;
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  readonly codeCommitRepo: codecommit.Repository;
  readonly codePipeline: codepipeline.Pipeline;
}

export type SitePipelineResources = CodecommitS3SitePipelineResources | CodecommitNpmSitePipelineResources;

export function toSsmParamName(somId: string, name: string) {
  return `/som/${somId}/${name}`;
}
