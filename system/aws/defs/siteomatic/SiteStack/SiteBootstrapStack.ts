import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import cloneDeep from 'lodash.clonedeep';

import { DEFAULT_STACK_PROPS } from '../../../../../lib/consts';
import type { SiteStackProps } from '../../../../../lib/types';
import * as DomainPublisherBoostrapBuilder from '../DomainPublisherBootstrapBuilder';
import * as DomainUserBootstrapBuilder from '../DomainUserBootstrapBuilder';

export class SiteBootstrapStack extends cdk.Stack {
  public readonly siteProps: SiteStackProps;
  public readonly somPrefix: string;
  public readonly rootDomainName: string;
  public readonly somId: string;

  public domainUserBootstrapResources: DomainUserBootstrapBuilder.DomainUserBootstrapResources | undefined;
  public domainPublisherBootstrapResources:
    | DomainPublisherBoostrapBuilder.DomainPublisherBootstrapResources
    | undefined;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, Object.assign({}, DEFAULT_STACK_PROPS(props.config, props.context.somId, props), props));

    this.somPrefix = props.config.SOM_PREFIX;
    this.rootDomainName = props.context.rootDomainName;
    this.somId = props.context.somId;
    this.siteProps = cloneDeep(props);
  }

  async build() {
    this.domainUserBootstrapResources = await DomainUserBootstrapBuilder.build(this);
    this.domainPublisherBootstrapResources = await DomainPublisherBoostrapBuilder.build(this);

    console.log(`Generated SiteBootstrapStack [${this.somId}]`);
  }
}
