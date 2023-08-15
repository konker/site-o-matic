import * as unit from './ssm';

describe('ssm', () => {
  describe('toSsmParamName', () => {
    it('should work as expected', () => {
      expect(unit.toSsmParamName('somId', 'name')).toEqual('/som/somId/name');
      expect(unit.toSsmParamName('somId', 'name', 'foo')).toEqual('/som/somId/name/foo');
      expect(unit.toSsmParamName('somId', 'name', 'foo', 'bar')).toEqual('/som/somId/name/foo/bar');
      expect(unit.toSsmParamName('somId', 'name', 'foo', 'bar', 'baz')).toEqual('/som/somId/name/foo/bar/baz');
    });
  });
});
