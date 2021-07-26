import * as dns from 'dns';
import * as cdk from '@aws-cdk/core';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as deployment from '@aws-cdk/aws-s3-deployment';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import { getContentProducer } from '../../../../content';
import { formulateStackName } from './lib';
import { DEFAULT_STACK_PROPS, SOM_TAG_NAME } from '../common';
import { SomSiteProps } from '../../../../lib';
import {SomSiteStack} from "./SomSiteStack";

export class SomProtectedSiteStack extends SomSiteStack implements SomSiteProps {
  public rootDomain: string;
  public webmasterEmail: string;
  public contentProducerId: string;
  public protected: boolean;
  public somId: string;

  constructor(scope: cdk.Construct, params: SomSiteProps) {
    super(scope, params);
  }

  async build(scope: cdk.Construct) {
    await super.build(scope);

    //[TODO: cognito user pool]

    //[TODO: lambda@edge function permissions]

    //[TODO: lambda@edge function]
  }
}
