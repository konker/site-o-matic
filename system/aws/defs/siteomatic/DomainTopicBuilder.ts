import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN,
  SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_NAME,
} from '../../../../lib/consts';
import { _somMeta } from '../../../../lib/utils';
import type { SiteResourcesStack } from './SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type DomainTopicResources = {
  readonly domainTopic: sns.Topic;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesStack): Promise<DomainTopicResources> {
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build domain topic resources when domainUser is missing');
  }
  if (!siteResourcesStack.domainPublisherResources?.domainPublisher) {
    throw new Error('[site-o-matic] Could not build domain topic resources when domainPublisher is missing');
  }

  // ----------------------------------------------------------------------
  // SNS topic for pipeline notifications
  const notificationsSnsTopic = new sns.Topic(siteResourcesStack, 'NotificationsSnsTopic', {
    displayName: `NotificationsSnsTopic-${siteResourcesStack.somId}`,
    topicName: `NotificationsSnsTopic-${siteResourcesStack.somId}`,
  });
  _somMeta(
    siteResourcesStack.siteProps.config,
    notificationsSnsTopic,
    siteResourcesStack.somId,
    siteResourcesStack.siteProps.locked
  );

  // Permissions for domainUser and domainPublisher
  notificationsSnsTopic.grantPublish(siteResourcesStack.domainUserResources.domainUser);
  notificationsSnsTopic.grantPublish(siteResourcesStack.domainPublisherResources.domainPublisher);

  // ----------------------------------------------------------------------
  // SSM Params
  const ssm1 = new ssm.StringParameter(siteResourcesStack, 'SsmSnsTopicName', {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.somId,
      SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_NAME
    ),
    stringValue: notificationsSnsTopic.topicName,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, ssm1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const ssm2 = new ssm.StringParameter(siteResourcesStack, 'SsmSnsTopicArn', {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.somId,
      SSM_PARAM_NAME_NOTIFICATIONS_SNS_TOPIC_ARN
    ),
    stringValue: notificationsSnsTopic.topicArn,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, ssm2, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  return {
    domainTopic: notificationsSnsTopic,
    ssmParams: [ssm1, ssm2],
  };
}
