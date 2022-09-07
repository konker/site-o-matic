import 'json5/lib/register';

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../../../site-o-matic.config.json5';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new SiteStack(app, config, 'som-id-test', {
    username: 'som-example-user',
    rootDomain: 'example.com',
    webmasterEmail: 'webmaster@example.com',
    contentProducerId: 'default',
    pipelineType: 'codecommit-s3',
    subdomains: [],
    extraDnsConfig: [],
    certificateClones: [],
    crossAccountAccess: [],
    protected: false,
    contextParams: {},
  });
  const template = Template.fromStack(stack);
  // THEN
  template.hasResourceProperties('', Match.anyValue());
});
