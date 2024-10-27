import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import cloneDeep from 'lodash.clonedeep';

import { BOOTSTRAP_STACK_ID, DEFAULT_STACK_PROPS, SITE_RESOURCES_STACK_ID } from '../../../../../lib/consts';
import type { SiteStackProps } from '../../../../../lib/types';
import { SiteBootstrapStack } from './SiteBootstrapStack';
import { SiteResourcesStack } from './SiteResourcesStack';

export class SiteStack extends cdk.Stack {
  public readonly siteProps: SiteStackProps;
  public readonly rootDomainName: string;
  public readonly somId: string;
  public bootstrapNestedStack: SiteBootstrapStack | undefined;
  public siteResourcesNestedStack: SiteResourcesStack | undefined;

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
    this.bootstrapNestedStack = new SiteBootstrapStack(
      this,
      BOOTSTRAP_STACK_ID(this.siteProps.context.somId),
      this.siteProps
    );
    await this.bootstrapNestedStack.build();

    this.siteResourcesNestedStack = new SiteResourcesStack(
      this,
      SITE_RESOURCES_STACK_ID(this.siteProps.context.somId),
      this.siteProps
    );
    await this.siteResourcesNestedStack.build();
    this.siteResourcesNestedStack.addDependency(this.bootstrapNestedStack);

    console.log(`Generated SiteStack [${this.somId}]`);
  }
}
