import { RemovalPolicy, Tags } from 'aws-cdk-lib';

import { SOM_TAG_NAME } from './consts';
import * as unit from './utils';

describe('utils', () => {
  describe('getParam', () => {
    it('should work as expected', async () => {
      expect(unit.getParam({ params: [] } as any, 'foo')).toBeUndefined();
      expect(unit.getParam({} as any, 'foo')).toBeUndefined();
      expect(
        unit.getParam(
          {
            params: [
              { Param: 'baz', Value: 'abc' },
              { Param: 'foo', Value: 'def' },
              { Param: 'qux', Value: 'fgh' },
            ],
          } as any,
          'foo'
        )
      ).toBe('def');
    });
  });

  describe('_id', () => {
    it('should work as expected', async () => {
      expect(unit._id('foo', 'bar', true)).toBe('foo');
      expect(unit._id('foo', 'bar', false)).toBe('foo-bar');
    });
  });

  describe('_removalPolicyFromBoolean', () => {
    it('should work as expected', async () => {
      expect(unit._removalPolicyFromBoolean(true)).toBe(RemovalPolicy.RETAIN);
      expect(unit._removalPolicyFromBoolean(false)).toBe(RemovalPolicy.DESTROY);
    });
  });

  describe('_somRemovalPolicy', () => {
    it('should work as expected', async () => {
      const applyRemovalPolicy = jest.fn();

      unit._somRemovalPolicy({ applyRemovalPolicy } as any, true);
      expect(applyRemovalPolicy).toHaveBeenCalledWith(RemovalPolicy.RETAIN);

      unit._somRemovalPolicy({ applyRemovalPolicy } as any, false);
      expect(applyRemovalPolicy).toHaveBeenCalledWith(RemovalPolicy.DESTROY);
    });
  });

  describe('_somTag', () => {
    beforeAll(() => {
      jest.spyOn(Tags, 'of').mockImplementation((x) => x as any);
    });
    afterAll(() => {
      jest.restoreAllMocks();
    });
    it('should work as expected', async () => {
      const add = jest.fn();

      unit._somTag({ add } as any, 'foo');
      expect(add).toHaveBeenCalledWith(SOM_TAG_NAME, 'foo');
    });
  });

  describe('_somMeta', () => {
    beforeAll(() => {
      jest.spyOn(Tags, 'of').mockImplementation((x) => x as any);
    });
    afterAll(() => {
      jest.restoreAllMocks();
    });
    it('should work as expected', async () => {
      const applyRemovalPolicy = jest.fn();
      const add = jest.fn();

      unit._somMeta({ applyRemovalPolicy, add } as any, 'foo', true);
      expect(applyRemovalPolicy).toHaveBeenCalledWith(RemovalPolicy.RETAIN);
      expect(add).toHaveBeenCalledWith(SOM_TAG_NAME, 'foo');

      unit._somMeta({ applyRemovalPolicy, add } as any, 'foo', false);
      expect(applyRemovalPolicy).toHaveBeenCalledWith(RemovalPolicy.DESTROY);
      expect(add).toHaveBeenCalledWith(SOM_TAG_NAME, 'foo');
    });
  });

  describe('matchArraySorting', () => {
    it('should work as expected', () => {
      expect(unit.matchArraySorting([1, 2, 3])([3, 2, 1])).toStrictEqual([1, 2, 3]);
      expect(unit.matchArraySorting([1, 2, 3])([1, 2, 3])).toStrictEqual([1, 2, 3]);
      expect(unit.matchArraySorting([1, 2, 3])([2, 1, 4, 3])).toStrictEqual([4, 1, 2, 3]);
    });
  });
});
