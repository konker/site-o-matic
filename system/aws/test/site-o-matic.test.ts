import 'json5/lib/register';

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../../../site-o-matic.config.json';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new SiteStack(app, config, 'som-id-test', {
    rootDomainName: 'example.com',
    title: 'Test Title',
    description: 'Site-o-matic test stack',
    username: 'som-example-user',
    contextParams: {},
    webmasterEmail: 'webmaster@example.com',
    protected: false,
    dns: {
      domainName: 'example.com',
      extraDnsConfig: [],
      subdomains: [],
    },
    webHosting: {
      type: 'cloudfront-s3',
    },
    pipeline: { type: 'codecommit-s3' },
    certificate: { clones: [] },
    crossAccountAccess: [],
    cfFunctionTmpFilePaths: [],
  });
  const template = Template.fromStack(stack);
  // THEN
  template.hasResourceProperties('', Match.anyValue());
});
