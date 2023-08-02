import 'json5/lib/register';

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import {
  WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID,
  WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID,
} from '../../../lib/consts';
import type { SomFacts } from '../../../lib/rules/site-o-matic.rules';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../../../site-o-matic.config.json';
import { SiteStack } from '../defs/siteomatic/site/SiteStack';

test('Empty Stack', () => {
  const app = new cdk.App();

  // WHEN
  const stack = new SiteStack(app, {
    config,
    username: 'som-example-user',
    contextParams: {},
    description: 'Site-o-matic test stack',
    protected: false,
    facts: {} as SomFacts,
    context: {
      somVersion: '0.0.2',
      somId: 'som-id-test',
      pathToManifestFile: '/foo/bar.json',
      rootDomainName: 'example.com',
      domainHash: 'abc123',
      siteUrl: 'https://example.com',
      subdomains: [],
      certificateCloneNames: [],
      crossAccountAccessNames: [],
      registrar: undefined,
      params: [],
      hostedZoneAttributes: undefined,
      hostedZoneNameservers: [],
      registrarNameservers: [],
      dnsResolvedNameserverRecords: [],
      dnsVerificationTxtRecord: undefined,
      connectionStatus: { statusCode: 403, statusMessage: 'Forbidden', timing: 123 },
      isS3BucketEmpty: false,
      manifest: {
        rootDomainName: 'example.com',
        title: 'Test Title',
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
      },
    },
    cfFunctionViewerRequestTmpFilePath: [WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID, undefined],
    cfFunctionViewerResponseTmpFilePath: [WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID, undefined],
  });
  const template = Template.fromStack(stack);

  // THEN
  //[FIXME: add better assertions]
  expect(template).toBeDefined();
  // template.hasResourceProperties('AWS::SNS::Topic', Match.anyValue());
});
