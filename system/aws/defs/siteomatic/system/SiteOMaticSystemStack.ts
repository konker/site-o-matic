import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';

import { DEFAULT_STACK_PROPS, SOM_TAG_NAME } from '../../../../../lib/consts';

export class SiteOMaticSystemStack extends cdk.Stack {
  constructor(scope: Construct) {
    super(scope, 'Site-O-Matic-System', DEFAULT_STACK_PROPS(SOM_TAG_NAME));
  }
}
