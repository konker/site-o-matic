/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'node:fs';
import path from 'node:path';

import JSON5 from 'json5';

import * as unit from './site-o-matic-manifest.schema';

describe('site-o-matic-manifest-schema', () => {
  it('should validate a complete example', async () => {
    const json = await fs.promises.readFile(path.join(__dirname, '../../../docs/site-o-matic.manifest.example.json5'));
    const data = JSON5.parse(json.toString());
    const validation = unit.SiteOMaticManifest.parse(data);
    // expect(validation.success).toEqual(true);
    expect(validation).toMatchSnapshot();
  });

  it('should validate a minimal example', async () => {
    const json = await fs.promises.readFile(
      path.join(__dirname, '../../../docs/site-o-matic.manifest.example.minimal.json5')
    );
    const data = JSON5.parse(json.toString());
    const validation = unit.SiteOMaticManifest.parse(data);
    // expect(validation.success).toEqual(true);
    expect(validation).toStrictEqual({
      domainName: 'minimal-example.com',
      locked: false,
      webHosting: [
        {
          originPath: '/www',
          defaultRootObject: 'index.html',
          domainName: 'minimal-example.com',
          errorResponses: [
            {
              httpStatus: 403,
              responsePagePath: '/403.html',
            },
            {
              httpStatus: 404,
              responsePagePath: '/404.html',
            },
          ],
          type: 'cloudfront-s3',
          content: {
            producerId: 'default',
          },
        },
      ],
      webHostingDefaults: {
        'cloudfront-https': {
          originPath: '/',
        },
        'cloudfront-s3': {
          originPath: '/www',
          defaultRootObject: 'index.html',
          errorResponses: [
            {
              httpStatus: 403,
              responsePagePath: '/403.html',
            },
            {
              httpStatus: 404,
              responsePagePath: '/404.html',
            },
          ],
          content: {
            producerId: 'default',
          },
        },
        none: {},
      },
    });
  });
});
