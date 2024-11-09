import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { TerraformStack } from 'cdktf';
import type { Construct } from 'constructs';
import cloneDeep from 'lodash.clonedeep';

import { DEFAULT_CERTIFICATE_REGION } from '../../../../lib/consts';
import type { SiteStackProps } from '../../../../lib/types';
import * as DomainUserBuilder from './DomainUserBuilder';

export class SiteStack extends TerraformStack {
  public readonly siteProps: SiteStackProps;

  public readonly providerManifestRegion: AwsProvider;
  public readonly providerCertificateRegion: AwsProvider;

  public domainUserResources: DomainUserBuilder.DomainUserResources | undefined;
  // public domainParametersResources: DomainParametersBuilder.DomainParametersResources | undefined;
  // public hostedZoneResources: HostedZoneBuilder.HostedZoneResources | undefined;
  // public extraDnsResources: ExtraDnsBuilder.ExtraDnsResources | undefined;
  // public domainBucketResources: DomainBucketBuilder.DomainBucketResources | undefined;
  // public domainTopicResources: DomainTopicBuilder.DomainTopicResources | undefined;
  // public webHostingResourcesList: Array<WebHostingBuilder.WebHostingResources> | undefined;

  constructor(scope: Construct, props: SiteStackProps) {
    super(scope, props.context.somId);

    this.siteProps = cloneDeep(props);

    this.providerManifestRegion = new AwsProvider(this, 'provider_manifest_region', {
      region: this.siteProps.context.manifest.region,
      alias: 'aws_provider_manifest',
    });
    this.providerCertificateRegion = new AwsProvider(this, 'provider_certificate_region', {
      region: DEFAULT_CERTIFICATE_REGION,
      alias: 'aws_provider_region',
    });
  }

  async build() {
    this.domainUserResources = await DomainUserBuilder.build(this);
    // this.domainParametersResources = await DomainParametersBuilder.build(this);
    // this.hostedZoneResources = await HostedZoneBuilder.build(this);
    // this.extraDnsResources = await ExtraDnsBuilder.build(this);
    // this.domainBucketResources = await DomainBucketBuilder.build(this);
    // this.domainTopicResources = await DomainTopicBuilder.build(this);

    // Only proceed with Cloudfront/etc when DNS config has been verified
    /*
    if (this.siteProps.facts.shouldDeployAllResources) {
      this.webHostingResourcesList = await Promise.all(
        this.siteProps.context.manifest.webHosting
          .filter((webHostingSpec) => webHostingSpec.type !== WEB_HOSTING_TYPE_NONE)
          .map((webHostingSpec) => WebHostingBuilder.build(this, this.siteProps.context.secrets, webHostingSpec))
      );

    }
    */
    console.log(`Generated SiteStack [${this.siteProps.context.somId}]`);
  }
}
