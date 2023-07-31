import * as unit from './index';

describe('rules', () => {
  const ruleNames = ['sumIsEven', 'productIsEven', 'c'] as const;
  type F = typeof ruleNames;
  type C = { x: number; y: number; z: number };

  describe('rulesEngine', () => {
    it('should work as expected', async () => {
      const rulesEngine = unit.rulesEngineFactory<F, C>({
        sumIsEven: async (_facts, context) => (context.x + context.y) % 2 === 0,
        productIsEven: async (_facts, context) => (context.x * context.y) % 2 === 0,
        c: async (facts, context) => facts.productIsEven && context.z === 3,
      });

      await expect(
        rulesEngine({
          x: 2,
          y: 3,
          z: 3,
        })
      ).resolves.toStrictEqual({ sumIsEven: false, productIsEven: true, c: true });

      await expect(
        rulesEngine({
          x: 2,
          y: 3,
          z: 0,
        })
      ).resolves.toStrictEqual({ sumIsEven: false, productIsEven: true, c: false });

      await expect(
        rulesEngine({
          x: 1,
          y: 3,
          z: 3,
        })
      ).resolves.toStrictEqual({ sumIsEven: true, productIsEven: false, c: false });
    });

    it('should work as expected with partial result', async () => {
      // @ts-expect-error partial rules cause a type error
      unit.rulesEngineFactory<F, C>({
        sumIsEven: async (_facts, context) => (context.x + context.y) % 2 === 0,
        productIsEven: async (_facts, context) => (context.x * context.y) % 2 === 0,
      });
    });
  });
});
