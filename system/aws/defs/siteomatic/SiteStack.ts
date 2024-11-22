import type { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { LocalProvider } from '@cdktf/provider-local/lib/provider';
import { TerraformStack } from 'cdktf';
import type { Construct } from 'constructs';
import cloneDeep from 'lodash.clonedeep';

import { DEFAULT_CERTIFICATE_REGION, WEB_HOSTING_TYPE_NONE } from '../../../../lib/consts';
import type { SiteStackProps } from '../../../../lib/types';
import * as DomainBucketBuilder from './DomainBucketBuilder';
import * as DomainBucketPermissionsBuilder from './DomainBucketPermissionsBuilder';
import * as DomainParametersBuilder from './DomainParametersBuilder';
import * as DomainTopicBuilder from './DomainTopicBuilder';
import * as DomainUserBuilder from './DomainUserBuilder';
import * as DomainUserPermissionsBuilder from './DomainUserPermissionsBuilder';
import * as ExtraDnsBuilder from './ExtraDnsBuilder';
import * as HostedZoneBuilder from './HostedZoneBuilder';
import * as WebHostingBuilder from './WebHostingBuilder';

export class SiteStack extends TerraformStack {
  public readonly siteProps: SiteStackProps;

  public readonly providerControlPlaneRegion: AwsProvider;
  public readonly providerManifestRegion: AwsProvider;
  public readonly providerCertificateRegion: AwsProvider;
  public readonly providerLocal: LocalProvider;
  public readonly domainUserPolicyDocuments: Array<DataAwsIamPolicyDocument>;
  public readonly domainBucketPolicyDocuments: Array<DataAwsIamPolicyDocument>;

  public domainUserResources: DomainUserBuilder.DomainUserResources | undefined;
  public domainParametersResources: DomainParametersBuilder.DomainParametersResources | undefined;
  public hostedZoneResources: HostedZoneBuilder.HostedZoneResources | undefined;
  public extraDnsResources: ExtraDnsBuilder.ExtraDnsResources | undefined;
  public domainBucketResources: DomainBucketBuilder.DomainBucketResources | undefined;
  public domainTopicResources: DomainTopicBuilder.DomainTopicResources | undefined;
  public webHostingResourcesList: Array<WebHostingBuilder.WebHostingResources> | undefined;
  public domainUserPermissionsResources: DomainUserPermissionsBuilder.DomainUserPermissionsResources | undefined;
  public domainBucketPermissionsResources: DomainBucketPermissionsBuilder.DomainBucketPermissionsResources | undefined;

  constructor(scope: Construct, props: SiteStackProps) {
    super(scope, props.context.somId);

    this.siteProps = cloneDeep(props);

    this.providerControlPlaneRegion = new AwsProvider(this, 'provider_control_plane_region', {
      region: props.config.AWS_REGION_CONTROL_PLANE,
      alias: 'aws_provider_control_plane',
    });
    this.providerManifestRegion = new AwsProvider(this, 'provider_manifest_region', {
      region: this.siteProps.context.manifest.region,
      alias: 'aws_provider_manifest',
    });
    this.providerCertificateRegion = new AwsProvider(this, 'provider_certificate_region', {
      region: DEFAULT_CERTIFICATE_REGION,
      alias: 'aws_provider_certificate',
    });
    this.providerLocal = new LocalProvider(this, 'provider_local', {
      alias: 'aws_provider_local',
    });

    this.domainUserPolicyDocuments = [];
    this.domainBucketPolicyDocuments = [];
  }

  async build() {
    this.domainUserResources = await DomainUserBuilder.build(this);
    this.domainParametersResources = await DomainParametersBuilder.build(this);
    this.hostedZoneResources = await HostedZoneBuilder.build(this);
    this.extraDnsResources = await ExtraDnsBuilder.build(this);
    this.domainBucketResources = await DomainBucketBuilder.build(this);
    this.domainTopicResources = await DomainTopicBuilder.build(this);

    // Only proceed with Cloudfront/etc when DNS config has been verified
    if (this.siteProps.facts.shouldDeployAllResources) {
      this.webHostingResourcesList = await Promise.all(
        this.siteProps.context.manifest.webHosting
          .filter((webHostingSpec) => webHostingSpec.type !== WEB_HOSTING_TYPE_NONE)
          .map((webHostingSpec) => WebHostingBuilder.build(this, this.siteProps.context.secrets, webHostingSpec))
      );
    }
    this.domainUserPermissionsResources = await DomainUserPermissionsBuilder.build(this);
    this.domainBucketPermissionsResources = await DomainBucketPermissionsBuilder.build(this);

    console.log(`Generated SiteStack [${this.siteProps.context.somId}]`);
  }
}
