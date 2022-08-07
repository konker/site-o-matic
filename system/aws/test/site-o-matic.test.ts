import { expect as expectCDK, MatchStyle, matchTemplate } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new SiteStack(app, 'som-id-test', {
    username: 'som-example-user',
    rootDomain: 'example.com',
    webmasterEmail: 'webmaster@example.com',
    contentProducerId: 'default',
    pipelineType: 'codecommit-s3',
    extraDnsConfig: [],
    protected: false,
    contextParams: {},
  });
  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
});
