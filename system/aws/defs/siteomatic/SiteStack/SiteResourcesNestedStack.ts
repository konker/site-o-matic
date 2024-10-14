import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import cloneDeep from 'lodash.clonedeep';

import { DEFAULT_STACK_PROPS, WEB_HOSTING_TYPE_NONE } from '../../../../../lib/consts';
import type { SiteStackProps } from '../../../../../lib/types';
import * as DomainBucketBuilder from '../DomainBucketBuilder';
import * as DomainParametersBuilder from '../DomainParametersBuilder';
import * as DomainTopicBuilder from '../DomainTopicBuilder';
import * as DomainUserBuilder from '../DomainUserBuilder';
import * as ExtraDnsBuilder from '../ExtraDnsBuilder';
import * as HostedZoneBuilder from '../HostedZoneBuilder';
import * as WebHostingBuilder from '../WebHostingBuilder';

export class SiteResourcesNestedStack extends cdk.Stack {
  public readonly siteProps: SiteStackProps;
  public readonly rootDomainName: string;
  public readonly somId: string;

  public domainParametersResources: DomainParametersBuilder.DomainParametersResources | undefined;
  public domainUserResources: DomainUserBuilder.DomainUserResources | undefined;
  public hostedZoneResources: HostedZoneBuilder.HostedZoneResources | undefined;
  public domainBucketResources: DomainBucketBuilder.DomainBucketResources | undefined;
  public domainTopicResources: DomainTopicBuilder.DomainTopicResources | undefined;
  public extraDnsResources: ExtraDnsBuilder.ExtraDnsResources | undefined;
  public webHostingResourcesList: Array<WebHostingBuilder.WebHostingResources> | undefined;

  constructor(scope: Construct, props: SiteStackProps) {
    super(
      scope,
      props.context.somId,
      Object.assign({}, DEFAULT_STACK_PROPS(props.config, props.context.somId, props), props)
    );

    this.rootDomainName = props.context.rootDomainName;
    this.somId = props.context.somId;
    this.siteProps = cloneDeep(props);
  }

  async build() {
    this.domainParametersResources = await DomainParametersBuilder.build(this);
    this.domainUserResources = await DomainUserBuilder.build(this);
    this.hostedZoneResources = await HostedZoneBuilder.build(this);
    this.extraDnsResources = await ExtraDnsBuilder.build(this);
    this.domainTopicResources = await DomainTopicBuilder.build(this);
    this.domainBucketResources = await DomainBucketBuilder.build(this);
    this.webHostingResourcesList = await Promise.all(
      this.siteProps.context.manifest.webHosting
        .filter((webHostingSpec) => webHostingSpec.type !== WEB_HOSTING_TYPE_NONE)
        .map((webHostingSpec) => WebHostingBuilder.build(this, webHostingSpec))
    );
    console.log(`Created SiteResourcesNestedStack [${this.somId}]`);
  }
}
