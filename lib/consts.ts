import * as cdk from "aws-cdk-lib";
import { SiteProps } from "./types";

export const AWS_REGION = "us-east-1";
export const DEFAULT_CERTIFICATE_REGION = "us-east-1";
export const CLS = "\u001b[2J\u001b[0;0H";

export const SOM_PREFIX = "som";
export const SOM_TAG_NAME = "Site-o-Matic";
export const MAX_SOM_ID_LEN = 48;

export const SITE_PIPELINE_TYPE_CODECOMMIT_S3 = "codecommit-s3";
export const SITE_PIPELINE_TYPE_CODECOMMIT_NPM = "codecommit-npm";

export const DEFAULT_STACK_PROPS = (
  somId: string,
  siteProps?: SiteProps
): cdk.StackProps => ({
  env: {
    account: siteProps?.env?.account ?? process.env.CDK_DEFAULT_ACCOUNT,
    region: siteProps?.env?.region ?? process.env.CDK_DEFAULT_REGION,
  },
  tags: { [SOM_TAG_NAME]: somId },
});

export const SOM_STATUS_NOT_STARTED = "NotStarted";
export const SOM_STATUS_HOSTED_ZONE_DEPLOYMENT_IN_PROGRESS =
  "HostedZoneDeploymentInProgress";
export const SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG =
  "HostedZoneAwaitingNameserverConfig";
export const SOM_STATUS_HOSTED_ZONE_OK = "HostedZoneOk";
export const SOM_STATUS_HOSTING_DEPLOYMENT_IN_PROGRESS =
  "HostingDeploymentInProgress";
export const SOM_STATUS_HOSTING_DEPLOYED = "HostingDeployed";
export const SOM_STATUS_PIPELINE_DEPLOYMENT_IN_PROGRESS =
  "PipelineDeploymentInProgress";
export const SOM_STATUS_PIPELINE_DEPLOYED = "PipelineDeployed";
export const SOM_STATUS_SITE_FUNCTIONAL = "SiteFunctional";

export type SomStatus =
  | typeof SOM_STATUS_NOT_STARTED
  | typeof SOM_STATUS_HOSTED_ZONE_DEPLOYMENT_IN_PROGRESS
  | typeof SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG
  | typeof SOM_STATUS_HOSTED_ZONE_OK
  | typeof SOM_STATUS_HOSTING_DEPLOYMENT_IN_PROGRESS
  | typeof SOM_STATUS_HOSTING_DEPLOYED
  | typeof SOM_STATUS_PIPELINE_DEPLOYMENT_IN_PROGRESS
  | typeof SOM_STATUS_PIPELINE_DEPLOYED
  | typeof SOM_STATUS_SITE_FUNCTIONAL;

export type SomParam = Record<string, string>;

export type SomState = {
  spinner: any;
  rootDomain?: string;
  subdomains?: Array<string>;
  crossAccountAccessNames?: Array<string>;
  siteUrl?: string;
  somId?: string;
  registrar?: string;
  registrarNameservers?: Array<string>;
  pathToManifestFile?: string;
  manifest?: any;
  params?: Array<SomParam>;
  status?: SomStatus;
  verificationTxtRecord?: string;
  protectedManifest?: string;
  protectedSsm?: string;
};

export type SomConfig = {
  SOM_PREFIX: string;
  SOM_TAG_NAME: string;
  SOM_ROLE_ARN: string;
};
