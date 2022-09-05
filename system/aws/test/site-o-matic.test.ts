import { Template, Match } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';
import 'json5/lib/register';

// @ts-ignore
import config from '../../../site-o-matic.config.json5';

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
