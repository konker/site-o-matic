import { RemovalPolicy, Tags } from 'aws-cdk-lib';

import * as unit from './utils';

describe('utils', () => {
  describe('getParam', () => {
    it('should work as expected', async () => {
      expect(unit.getContextParam({ params: [] } as any, 'foo')).toBeUndefined();
      expect(unit.getContextParam({} as any, 'foo')).toBeUndefined();
      expect(
        unit.getContextParam(
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

      unit._somTag({ SOM_TAG_NAME: 'TAG_NAME' } as any, { add } as any, 'foo');
      expect(add).toHaveBeenCalledWith('TAG_NAME', 'foo');
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

      unit._somMeta({ SOM_TAG_NAME: 'TAG_NAME' } as any, { applyRemovalPolicy, add } as any, 'foo', true);
      expect(applyRemovalPolicy).toHaveBeenCalledWith(RemovalPolicy.RETAIN);
      expect(add).toHaveBeenCalledWith('TAG_NAME', 'foo');

      unit._somMeta({ SOM_TAG_NAME: 'TAG_NAME' } as any, { applyRemovalPolicy, add } as any, 'foo', false);
      expect(applyRemovalPolicy).toHaveBeenCalledWith(RemovalPolicy.DESTROY);
      expect(add).toHaveBeenCalledWith('TAG_NAME', 'foo');
    });
  });

  describe('matchArraySorting', () => {
    it('should work as expected', () => {
      expect(unit.matchArraySorting([1, 2, 3])([3, 2, 1])).toStrictEqual([1, 2, 3]);
      expect(unit.matchArraySorting([1, 2, 3])([1, 2, 3])).toStrictEqual([1, 2, 3]);
      expect(unit.matchArraySorting([1, 2, 3])([2, 1, 4, 3])).toStrictEqual([4, 1, 2, 3]);
    });
  });

  describe('matchArraySortingFragmentProducerDefs', () => {
    it('should work as expected', () => {
      expect(
        unit.matchArraySortingFragmentProducerDefs(['A', 'B', 'C'])([
          { id: 'C', spec: undefined },
          { id: 'B', spec: undefined },
          { id: 'A', spec: undefined },
        ])
      ).toStrictEqual([
        { id: 'A', spec: undefined },
        { id: 'B', spec: undefined },
        { id: 'C', spec: undefined },
      ]);
      expect(
        unit.matchArraySortingFragmentProducerDefs(['A', 'B', 'C'])([
          { id: 'A', spec: undefined },
          { id: 'B', spec: undefined },
          { id: 'C', spec: undefined },
        ])
      ).toStrictEqual([
        { id: 'A', spec: undefined },
        { id: 'B', spec: undefined },
        { id: 'C', spec: undefined },
      ]);
      expect(
        unit.matchArraySortingFragmentProducerDefs(['A', 'B', 'C'])([
          { id: 'B', spec: undefined },
          { id: 'A', spec: undefined },
          { id: 'D', spec: undefined },
          { id: 'C', spec: undefined },
        ])
      ).toStrictEqual([
        { id: 'D', spec: undefined },
        { id: 'A', spec: undefined },
        { id: 'B', spec: undefined },
        { id: 'C', spec: undefined },
      ]);
    });
  });

  describe('contextTemplateString', () => {
    it('should work as expected', () => {
      expect(unit.contextTemplateString(undefined, {} as any)).toBeUndefined();
      expect(unit.contextTemplateString('foo', {} as any)).toBe('foo');
      expect(unit.contextTemplateString('{{foo}}', {} as any)).toBe('');
      expect(unit.contextTemplateString('something+{{context.foo}}@example.com', { foo: 'FOO' } as any)).toBe(
        'something+FOO@example.com'
      );
    });
  });
});
