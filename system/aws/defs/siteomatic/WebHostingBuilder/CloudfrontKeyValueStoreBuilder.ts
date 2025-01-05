import { CloudfrontKeyValueStore } from '@cdktf/provider-aws/lib/cloudfront-key-value-store';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { SsmParameter } from '@cdktf/provider-aws/lib/ssm-parameter';

import { toSsmParamName } from '../../../../../lib/aws/ssm';
import {
  SSM_PARAM_NAME_CLOUDFRONT_KEY_VALUE_STORE_ARN,
  SSM_PARAM_NAME_CLOUDFRONT_KEY_VALUE_STORE_NAME,
} from '../../../../../lib/consts';
import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import { _somTags } from '../../../../../lib/utils';
import type { SiteStack } from '../SiteStack';

// ----------------------------------------------------------------------
export type CloudfrontKeyValueStoreResources = {
  readonly keyValueStore: CloudfrontKeyValueStore;
  readonly ssmParams: Array<SsmParameter>;
};

// ----------------------------------------------------------------------
export async function build(
  siteStack: SiteStack,
  webHostingSpec: WebHostingClauseWithResources,
  localIdPostfix: string
): Promise<CloudfrontKeyValueStoreResources> {
  // ----------------------------------------------------------------------
  const keyValueStore = new CloudfrontKeyValueStore(siteStack, `KeyValueStore-${localIdPostfix}`, {
    name: `KeyValueStore-${localIdPostfix}`,
  });

  // ----------------------------------------------------------------------
  siteStack.domainUserPolicyDocuments.push(
    new DataAwsIamPolicyDocument(siteStack, 'DomainUserKeyValueStorePolicyDocument', {
      statement: [
        {
          effect: 'Allow',
          actions: [
            'cloudfront-keyvaluestore:DeleteKey',
            'cloudfront-keyvaluestore:DescribeKeyValueStore',
            'cloudfront-keyvaluestore:GetKey',
            'cloudfront-keyvaluestore:ListKeys',
            'cloudfront-keyvaluestore:PutKey',
            'cloudfront-keyvaluestore:UpdateKeys',
          ],
          resources: [keyValueStore.arn],
        },
      ],
    })
  );

  // ----------------------------------------------------------------------
  // SSM Params
  const ssm1 = new SsmParameter(siteStack, `SsmCloudfrontKeyValueStoreArn-${localIdPostfix}`, {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_CLOUDFRONT_KEY_VALUE_STORE_ARN,
      webHostingSpec.domainName
    ),
    value: keyValueStore.arn,
    provider: siteStack.providerControlPlaneRegion,
    tags: _somTags(siteStack),
  });
  const ssm2 = new SsmParameter(siteStack, `SsmCloudfrontKeyValueStoreName-${localIdPostfix}`, {
    type: 'String',
    name: toSsmParamName(
      siteStack.siteProps.config,
      siteStack.siteProps.context.somId,
      SSM_PARAM_NAME_CLOUDFRONT_KEY_VALUE_STORE_NAME,
      webHostingSpec.domainName
    ),
    value: keyValueStore.name,
    provider: siteStack.providerControlPlaneRegion,
    tags: _somTags(siteStack),
  });

  return {
    keyValueStore,
    ssmParams: [ssm1, ssm2],
  };
}
