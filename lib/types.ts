import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import {
  SITE_PIPELINE_TYPE_CODECOMMIT_NPM,
  SITE_PIPELINE_TYPE_CODECOMMIT_S3,
} from "./consts";
import { SiteStack } from "../system/aws/defs/siteomatic/site/SiteStack";

// ----------------------------------------------------------------------
export type DnsConfigMx = {
  readonly type: "MX";
  readonly hostName: string;
  readonly priority: number;
};

export type DnsConfigCname = {
  readonly type: "CNAME";
  readonly recordName: string;
  readonly domainName: string;
};

export type DnsConfigTxt = {
  readonly type: "TXT";
  readonly recordName: string;
  readonly values: Array<string>;
};

export type HostedZoneDnsConfig = DnsConfigMx | DnsConfigCname | DnsConfigTxt;

export type HostedZoneConfig = {
  readonly domainName: string;
  readonly extraDnsConfig: Array<HostedZoneDnsConfig>;
};
// ----------------------------------------------------------------------
export type HostedZoneResources = {
  readonly hostedZone: route53.PublicHostedZone;
};

export type CertificateResources = {
  readonly domainCertificate: certificatemanager.ICertificate;
};

export type WebHostingResources = {
  readonly domainBucket: s3.Bucket;
  readonly originAccessIdentity: cloudfront.OriginAccessIdentity;
  readonly cloudFrontDistribution: cloudfront.Distribution;
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

export type PipelineResources =
  | CodecommitS3SitePipelineResources
  | CodecommitNpmSitePipelineResources;

// ----------------------------------------------------------------------
export type HostedZoneBuilderProps = {
  readonly siteStack: SiteStack;
  readonly domainName: string;
  readonly extraDnsConfig: Array<HostedZoneDnsConfig>;
  readonly subdomains?: Array<HostedZoneConfig>;
};

// ----------------------------------------------------------------------
export type CertificateCloneSpec = {
  readonly account: string;
  readonly region: string;
};

export type CrossAccountAccessGrantRoleSpec = {
  readonly name: string;
  readonly arn: string;
};

export type SiteStackProps = cdk.StackProps & {
  readonly rootDomain: string;
  readonly webmasterEmail: string;
  readonly username: string;
  readonly contentProducerId: string;
  readonly pipelineType: PipelineType;
  readonly extraDnsConfig: Array<HostedZoneDnsConfig>;
  readonly subdomains: Array<HostedZoneConfig>;
  readonly certificateClones: Array<CertificateCloneSpec>;
  readonly crossAccountAccess: Array<CrossAccountAccessGrantRoleSpec>;
  readonly protected: boolean;
  readonly contextParams: Record<string, string>;
  readonly env?: Record<string, string>;
};

export type SiteNestedStackProps = cdk.StackProps & {};

// ----------------------------------------------------------------------
export type CertificateBuilderProps = {
  readonly siteStack: SiteStack;
  readonly region: string;
  readonly domainName: string;
  readonly hostedZoneId: string;
  readonly subdomains: Array<HostedZoneConfig>;
};

// ----------------------------------------------------------------------
export type WebHostingBuilderProps = {
  readonly siteStack: SiteStack;
  readonly domainCertificate: certificatemanager.ICertificate;
};

// ----------------------------------------------------------------------
export type PipelineType =
  | typeof SITE_PIPELINE_TYPE_CODECOMMIT_S3
  | typeof SITE_PIPELINE_TYPE_CODECOMMIT_NPM;

export type PipelineBuilderProps = {
  readonly siteStack: SiteStack;
  readonly pipelineType: PipelineType;
};
