import * as cdk from '@aws-cdk/core';
import { DEFAULT_STACK_PROPS, SOM_TAG_NAME } from '../../../../../lib/consts';

export class SiteOMaticSystemStack extends cdk.Stack {
  constructor(scope: cdk.Construct) {
    super(scope, 'Site-O-Matic-System', DEFAULT_STACK_PROPS(SOM_TAG_NAME));
  }
}
