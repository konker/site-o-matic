import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';
import * as unit from './ssm';

describe('ssm', () => {
  const TEST_CONFIG: SiteOMaticConfig = {
    SOM_PREFIX: 'SOM',
    AWS_REGION_CONTROL_PLANE: 'us-east-1',
    AWS_REGION_DEPLOYMENT_DEFAULT: 'eu-west-1',
    SOM_TAG_NAME: 'test-som-tag',
  };

  describe('toSsmParamName', () => {
    it('should work as expected', () => {
      expect(unit.toSsmParamName(TEST_CONFIG, 'somId', 'name')).toEqual('/params/SOM/somId/name');
      expect(unit.toSsmParamName(TEST_CONFIG, 'somId', 'name', '')).toEqual('/params/SOM/somId/name');
      expect(unit.toSsmParamName(TEST_CONFIG, 'somId', 'name', 'foo')).toEqual('/params/SOM/somId/name/foo');
      expect(unit.toSsmParamName(TEST_CONFIG, 'somId', 'name', 'foo', 'bar')).toEqual('/params/SOM/somId/name/foo/bar');
      expect(unit.toSsmParamName(TEST_CONFIG, 'somId', 'name', 'foo', 'bar', 'baz')).toEqual(
        '/params/SOM/somId/name/foo/bar/baz'
      );
    });
  });
});
