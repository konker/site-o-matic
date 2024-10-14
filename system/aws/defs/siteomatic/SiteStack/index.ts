import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import cloneDeep from 'lodash.clonedeep';

import { DEFAULT_STACK_PROPS } from '../../../../../lib/consts';
import type { SiteStackProps } from '../../../../../lib/types';

export class SiteStack extends cdk.Stack {
  public readonly siteProps: SiteStackProps;
  public readonly rootDomainName: string;
  public readonly somId: string;

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
    console.log(`Created SiteStack [${this.somId}]`);
  }
}
