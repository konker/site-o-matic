import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { SnsTopic } from '@cdktf/provider-aws/lib/sns-topic';
import { SsmParameter } from '@cdktf/provider-aws/lib/ssm-parameter';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN,
  SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_NAME,
} from '../../../../lib/consts';
import { _somTags } from '../../../../lib/utils';
import type { SiteStack } from './SiteStack';

// ----------------------------------------------------------------------
export type DomainTopicResources = {
  readonly domainTopic: SnsTopic;
  readonly ssmParams: Array<SsmParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteStack: SiteStack): Promise<DomainTopicResources> {
  if (!siteStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build domain topic resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  // SNS topic for pipeline notifications
  const domainTopic = new SnsTopic(siteStack, 'NotificationsSnsTopic', {
    displayName: `NotificationsSnsTopic-${siteStack.siteProps.context.somId}`,
    name: `NotificationsSnsTopic-${siteStack.siteProps.context.somId}`,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  siteStack.domainUserPolicyDocuments.push(
    new DataAwsIamPolicyDocument(siteStack, 'DomainTopicPolicyDocument', {
      statement: [
        {
          effect: 'Allow',
          actions: ['sns:Publish'],
          resources: [domainTopic.arn],
        },
      ],
    })
  );

  // ----------------------------------------------------------------------
  // SSM Params
  const ssm1 = new SsmParameter(siteStack, 'SsmSnsTopicName', {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_NAME
    ),
    value: domainTopic.name,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  const ssm2 = new SsmParameter(siteStack, 'SsmSnsTopicArn', {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN
    ),
    value: domainTopic.arn,
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  return {
    domainTopic,
    ssmParams: [ssm1, ssm2],
  };
}
