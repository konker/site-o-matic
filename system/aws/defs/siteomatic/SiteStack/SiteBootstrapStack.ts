import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import cloneDeep from 'lodash.clonedeep';

import { DEFAULT_STACK_PROPS } from '../../../../../lib/consts';
import type { SiteStackProps } from '../../../../../lib/types';
import * as DomainPublisherBoostrapBuilder from '../DomainPublisherBootstrapBuilder';
import * as DomainUserBootstrapBuilder from '../DomainUserBootstrapBuilder';

export class SiteBootstrapStack extends cdk.Stack {
  public readonly siteProps: SiteStackProps;
  public readonly rootDomainName: string;
  public readonly somId: string;

  public domainUserResources: DomainUserBootstrapBuilder.DomainUserBootstrapResources | undefined;
  public domainPublisherResources: DomainPublisherBoostrapBuilder.DomainPublisherBootstrapResources | undefined;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, Object.assign({}, DEFAULT_STACK_PROPS(props.config, props.context.somId, props), props));

    this.rootDomainName = props.context.rootDomainName;
    this.somId = props.context.somId;
    this.siteProps = cloneDeep(props);
  }

  async build() {
    this.domainUserResources = await DomainUserBootstrapBuilder.build(this);
    this.domainPublisherResources = await DomainPublisherBoostrapBuilder.build(this);

    console.log(`Generated SiteBootstrapStack [${this.somId}]`);
  }
}
