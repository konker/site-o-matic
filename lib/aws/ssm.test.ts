import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';
import * as unit from './ssm';

describe('ssm', () => {
  const TEST_CONFIG: SiteOMaticConfig = {
    SOM_PREFIX: 'SOM',
    SOM_ROLE_ARN: 'arn:aws::::',
    SOM_TAG_NAME: 'test-som-tag',
  };

  describe('toSsmParamName', () => {
    it('should work as expected', () => {
      expect(unit.toSsmParamName(TEST_CONFIG, 'somId', 'name')).toEqual('/som/somId/name');
      expect(unit.toSsmParamName(TEST_CONFIG, 'somId', 'name', '')).toEqual('/som/somId/name');
      expect(unit.toSsmParamName(TEST_CONFIG, 'somId', 'name', 'foo')).toEqual('/som/somId/name/foo');
      expect(unit.toSsmParamName(TEST_CONFIG, 'somId', 'name', 'foo', 'bar')).toEqual('/som/somId/name/foo/bar');
      expect(unit.toSsmParamName(TEST_CONFIG, 'somId', 'name', 'foo', 'bar', 'baz')).toEqual(
        '/som/somId/name/foo/bar/baz'
      );
    });
  });
});
