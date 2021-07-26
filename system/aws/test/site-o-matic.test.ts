import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as SiteOMatic from '../defs/site/SomSiteStack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new SiteOMatic.SomSiteStack(app, {
    rootDomain: 'example.com',
    webmasterEmail: 'webmaster@example.com',
    contentProducerId: 'default',
    protected: false
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
