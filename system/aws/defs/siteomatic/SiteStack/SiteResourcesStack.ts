import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import cloneDeep from 'lodash.clonedeep';

import { DEFAULT_STACK_PROPS, WEB_HOSTING_TYPE_NONE } from '../../../../../lib/consts';
import type { SiteStackProps } from '../../../../../lib/types';
import * as DomainBucketBuilder from '../DomainBucketBuilder';
import * as DomainParametersBuilder from '../DomainParametersBuilder';
import * as DomainPublisherBuilder from '../DomainPublisherBuilder';
import * as DomainTopicBuilder from '../DomainTopicBuilder';
import * as DomainUserBuilder from '../DomainUserBuilder';
import * as ExtraDnsBuilder from '../ExtraDnsBuilder';
import * as HostedZoneBuilder from '../HostedZoneBuilder';
import * as WebHostingBuilder from '../WebHostingBuilder';

export class SiteResourcesStack extends cdk.Stack {
  public readonly siteProps: SiteStackProps;

  public domainUserResources: DomainUserBuilder.DomainUserResources | undefined;
  public domainPublisherResources: DomainPublisherBuilder.DomainPublisherResources | undefined;
  public domainParametersResources: DomainParametersBuilder.DomainParametersResources | undefined;
  public hostedZoneResources: HostedZoneBuilder.HostedZoneResources | undefined;
  public extraDnsResources: ExtraDnsBuilder.ExtraDnsResources | undefined;
  public domainBucketResources: DomainBucketBuilder.DomainBucketResources | undefined;
  public domainTopicResources: DomainTopicBuilder.DomainTopicResources | undefined;
  public webHostingResourcesList: Array<WebHostingBuilder.WebHostingResources> | undefined;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, Object.assign({}, DEFAULT_STACK_PROPS(props.config, props.context.somId, props), props));

    this.siteProps = cloneDeep(props);
  }

  async build() {
    this.domainUserResources = await DomainUserBuilder.build(this);
    this.domainPublisherResources = await DomainPublisherBuilder.build(this);
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

    console.log(
      `Generated SiteResourcesStack [${this.siteProps.context.somId}] in region: ${this.siteProps.env.region}`
    );
  }
}
