import * as unit from './utils';

describe('ui/utils', () => {
  describe('maxLenLabel', () => {
    it('should work as expected', () => {
      expect(unit.maxLenLabel('123456789')).toEqual('123456789');
      expect(unit.maxLenLabel('123456789', 1)).toEqual('1');
      expect(unit.maxLenLabel('123456789', 2)).toEqual('12');
      expect(unit.maxLenLabel('123456789', 3)).toEqual('123');
      expect(unit.maxLenLabel('123456789', 4)).toEqual('1234');
      expect(unit.maxLenLabel('123456789', 5)).toEqual('1...9');
      expect(unit.maxLenLabel('123456789', 6)).toEqual('1...89');
      expect(unit.maxLenLabel('123456789', 7)).toEqual('12...89');
      expect(unit.maxLenLabel('123456789', 8)).toEqual('12...789');
      expect(unit.maxLenLabel('123456789', 9)).toEqual('123456789');
      expect(unit.maxLenLabel('123456789', 10)).toEqual('123456789');
    });
  });

  describe('ssmParamLabel', () => {
    it('should work as expected', () => {
      expect(unit.ssmParamLabel('name')).toEqual('name');
      expect(unit.ssmParamLabel('name/foo')).toEqual('name\n ↪ foo');
      expect(unit.ssmParamLabel('name/foo/bar')).toEqual('name\n ↪ foo\n ↪ bar');
      expect(unit.ssmParamLabel('name/foo/bar/baz')).toEqual('name\n ↪ foo\n ↪ bar\n ↪ baz');
    });
  });
});
