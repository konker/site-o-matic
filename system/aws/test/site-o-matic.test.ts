import { expect as expectCDK, MatchStyle, matchTemplate } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new SiteStack(
    app,
    {
      rootDomain: 'example.com',
      webmasterEmail: 'webmaster@example.com',
      contentProducerId: 'default',
      pipelineType: 'codecommit-s3',
      extraDnsConfig: [],
      protected: false,
    }
  );
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
