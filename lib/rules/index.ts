export type FactName<F extends ReadonlyArray<string>> = F[number];
export type Facts<F extends ReadonlyArray<string>> = Record<FactName<F>, boolean>;
export type RulePredicate<F extends ReadonlyArray<string>, C> = (facts: Facts<F>, context: C) => Promise<boolean>;
export type Rule<F extends ReadonlyArray<string>, C> = [name: FactName<F>, predicate: RulePredicate<F, C>];
export type RulesEngine<F extends ReadonlyArray<string>, C> = (context: C) => Promise<Facts<F>>;
export type RulesEngineFactory<F extends ReadonlyArray<string>, C> = (rules: Array<Rule<F, C>>) => RulesEngine<F, C>;

export function is(x: unknown): boolean {
  return !!x;
}

export function isNot(x: unknown): boolean {
  return !is(x);
}

export function isNonZero(x: number | undefined): boolean {
  return is(x ?? 0 > 0);
}

export function rulesEngineFactory<F extends ReadonlyArray<string>, C>(
  rules: Record<FactName<F>, RulePredicate<F, C>>
): RulesEngine<F, C> {
  return async (context: C): Promise<Facts<F>> => {
    return Object.entries<RulePredicate<F, C>>(rules).reduce(async (acc, [name, predicate]) => {
      const accAwaited = await acc;
      // Don't overwrite existing values
      if (name in acc) return accAwaited;
      return { ...accAwaited, [name]: await predicate(accAwaited, context) };
    }, Promise.resolve({}) as Promise<Facts<F>>);
  };
}
