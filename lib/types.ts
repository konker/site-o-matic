import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import { SITE_PIPELINE_TYPE_CODECOMMIT_NPM, SITE_PIPELINE_TYPE_CODECOMMIT_S3 } from './consts';

export type SitePipelineType = typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3 | typeof SITE_PIPELINE_TYPE_CODECOMMIT_NPM;

export type DnsConfigMx = {
  readonly type: 'MX';
  readonly hostName: string;
  readonly priority: number;
};

export type DnsConfigCname = {
  readonly type: 'CNAME';
  readonly recordName: string;
  readonly domainName: string;
};

export type DnsConfigTxt = {
  readonly type: 'TXT';
  readonly recordName: string;
  readonly values: Array<string>;
};

export type SiteHostedZoneDnsConfig = DnsConfigMx | DnsConfigCname | DnsConfigTxt;

export type HostedZoneConfig = {
  readonly domainName: string;
  readonly extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
};

export type SiteHostedZoneProps = {
  readonly domainName: string;
  readonly extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
  readonly subdomains?: Array<HostedZoneConfig>;
};

export type CertificateCloneSpec = {
  readonly account: number;
  readonly region: string;
};

export type CrossAccountAccessGrantRoleSpec = {
  readonly name: string;
  readonly arn: string;
};

export type SiteProps = cdk.StackProps & {
  readonly rootDomain: string;
  readonly webmasterEmail: string;
  readonly username: string;
  readonly contentProducerId: string;
  readonly pipelineType: SitePipelineType;
  readonly extraDnsConfig: Array<SiteHostedZoneDnsConfig>;
  readonly subdomains: Array<HostedZoneConfig>;
  readonly certificateClones: Array<CertificateCloneSpec>;
  readonly crossAccountAccess: Array<CrossAccountAccessGrantRoleSpec>;
  readonly protected: boolean;
  readonly contextParams: Record<string, string>;
  readonly env?: Record<string, string>;
};

export type HostedZoneStackResources = {
  readonly hostedZone: route53.PublicHostedZone;
};

export type SiteCertificateProps = {
  region: string;
  domainName: string;
  hostedZoneId: string;
  subdomains: Array<HostedZoneConfig>;
};

export type SiteCertificateStackResources = {
  readonly domainCertificate: certificatemanager.ICertificate;
};

export type SiteHostingProps = {
  readonly domainCertificate: certificatemanager.ICertificate;
};

export type SiteHostingStackResources = {
  readonly domainBucket: s3.Bucket;
  readonly originAccessIdentity: cloudfront.OriginAccessIdentity;
  readonly cloudFrontDistribution: cloudfront.Distribution;
};

export type SitePipelineProps = {
  readonly pipelineType: SitePipelineType;
};

export type BaseSitePipelineResources = {
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
};

export type BaseCodecommitSitePipelineResources = {
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  readonly codeCommitRepo: codecommit.Repository;
};

export type CodecommitS3SitePipelineResources = {
  readonly type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3;
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  readonly codeCommitRepo: codecommit.Repository;
  readonly codePipeline: codepipeline.Pipeline;
};

export type CodecommitNpmSitePipelineResources = {
  readonly type: typeof SITE_PIPELINE_TYPE_CODECOMMIT_NPM;
  readonly invalidateCloudfrontCodeBuildProject: codebuild.PipelineProject;
  readonly codeCommitRepo: codecommit.Repository;
  readonly codePipeline: codepipeline.Pipeline;
};

export type SitePipelineResources = CodecommitS3SitePipelineResources | CodecommitNpmSitePipelineResources;

export function toSsmParamName(somId: string, name: string) {
  return `/som/${somId}/${name}`;
}
