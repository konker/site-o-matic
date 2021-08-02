export const AWS_REGION = 'us-east-1';
export const CLS = '\u001b[2J\u001b[0;0H';

export const SOM_STATUS_NOT_STARTED = 'NotStarted';
export const SOM_STATUS_HOSTED_ZONE_DEPLOYMENT_IN_PROGRESS = 'HostedZoneDeploymentInProgress';
export const SOM_STATUS_HOSTED_ZONE_AWAITING_NS_CONFIG = 'HostedZoneAwaitingNameserverConfig';
export const SOM_STATUS_HOSTED_ZONE_OK = 'HostedZoneOk';
export const SOM_STATUS_HOSTING_DEPLOYMENT_IN_PROGRESS = 'HostingDeploymentInProgress';
export const SOM_STATUS_HOSTING_DEPLOYED = 'HostingDeployed';
export const SOM_STATUS_PIPELINE_DEPLOYMENT_IN_PROGRESS = 'PipelineDeploymentInProgress';
export const SOM_STATUS_PIPELINE_DEPLOYED = 'PipelineDeployed';
export const SOM_STATUS_SITE_FUNCTIONAL = 'SiteFunctional';

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

export type SomParam = { [key: string]: string };

export interface SomState {
  rootDomain?: string;
  siteUrl?: string;
  somId?: string;
  pathToManifestFile?: string;
  manifest?: any;
  params?: Array<SomParam>;
  status?: SomStatus;
  verificationTxtRecord?: string;
}
