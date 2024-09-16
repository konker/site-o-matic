import fs from 'node:fs';
import path from 'node:path';

import JSON5 from 'json5';

import { applyManifestDefaults } from '../../json5';
import * as unit from './site-o-matic-manifest-schema';

describe('site-o-matic-manifest-schema', () => {
  it('should validate a complete example', async () => {
    const json = await fs.promises.readFile(path.join(__dirname, '../../../docs/site-o-matic.manifest.example.json5'));
    const data = JSON5.parse(json.toString());
    const validation = unit.SiteOMaticManifest.safeParse(data);
    expect(validation.success).toEqual(true);
    expect(validation.data).toMatchSnapshot();
  });

  it('should validate a minimal example', async () => {
    const json = await fs.promises.readFile(
      path.join(__dirname, '../../../docs/site-o-matic.manifest.minimal.example.json5')
    );
    const data = JSON5.parse(json.toString());
    const validation = unit.SiteOMaticManifest.safeParse(applyManifestDefaults(data));
    expect(validation.success).toEqual(true);
    expect(validation.data).toStrictEqual({
      dns: {
        domainName: 'minimal-example.com',
      },
      protected: false,
      rootDomainName: 'minimal-example.com',
      webHosting: {
        type: 'cloudfront-s3',
      },
    });
  });
});
