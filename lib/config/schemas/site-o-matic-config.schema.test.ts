import fs from 'node:fs';
import path from 'node:path';

import JSON5 from 'json5';

import * as unit from './site-o-matic-config.schema';

describe('site-o-matic-config-schema', () => {
  it('should validate a complete example', async () => {
    const json = await fs.promises.readFile(path.join(__dirname, '../../../docs/site-o-matic.config.example.json5'));
    const data = JSON5.parse(json.toString());
    const validation = unit.SiteOMaticConfig.parse(data);
    // expect(validation.success).toEqual(true);
    expect(validation).toStrictEqual({
      SOM_ADMIN_ROLE_ARN: 'arn:aws:iam::111111111111:role/OrganizationAccountAccessRole',
      AWS_REGION_CONTROL_PLANE: 'us-east-1',
      AWS_REGION_DEPLOYMENT_DEFAULT: 'us-east-1',
      WEBMASTER_EMAIL_DEFAULT: 'webmaster+{{context.manifest.rootDomainName}}@example.com',
      SOM_TAG_NAME: 'site-o-matic-tag-name',
      SOM_PREFIX: 'som-foo',
    });
  });

  it('should validate a minimal example', async () => {
    const json = await fs.promises.readFile(
      path.join(__dirname, '../../../docs/site-o-matic.config.example.minimal.json5')
    );
    const data = JSON5.parse(json.toString());
    const validation = unit.SiteOMaticConfig.safeParse(data);
    expect(validation.success).toEqual(true);
    expect(validation.data).toStrictEqual({
      SOM_ADMIN_ROLE_ARN: 'arn:aws:iam::111111111111:role/OrganizationAccountAccessRole',
      AWS_REGION_CONTROL_PLANE: 'us-east-1',
      AWS_REGION_DEPLOYMENT_DEFAULT: 'eu-west-1',
      SOM_TAG_NAME: 'Site-o-Matic',
      SOM_PREFIX: 'som',
    });
  });
});
