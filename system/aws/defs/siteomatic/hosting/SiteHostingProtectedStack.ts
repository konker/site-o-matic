import * as cdk from '@aws-cdk/core';
import { SiteProps } from '../../../../../lib';
import { SiteHostingProps } from '../common';
import { SiteHostingStack } from './SiteHostingStack';

export class SiteHostingProtectedStack extends SiteHostingStack {
  constructor(scope: cdk.Construct, siteProps: SiteProps, props: SiteHostingProps) {
    super(scope, siteProps, props);
  }

  async build() {
    await super.build();

    //[TODO: cognito user pool]

    //[TODO: lambda@edge function permissions]

    //[TODO: lambda@edge function]
  }
}
