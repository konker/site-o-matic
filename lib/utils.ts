import { SomState } from './consts';

export function getParam(state: SomState, name: string): string | undefined {
  return state.params?.find((i: any) => i.Param === name)?.Value;
}

export function _id(prefix: string, domainName: string, isRoot: boolean): string {
  return isRoot ? prefix : `${prefix}-${domainName}`;
}

/**
 * Perform an Array::reduce using an async function. Execution is sequential.
 *
 * @param a - The array to reduce
 * @param f - The function to apply
 * @param s - The initial value
 */
export async function asyncReduce<T, S>(
  a: Array<T>,
  f: (acc: S, t: T, i: number, orig: Array<T>) => Promise<S>,
  s: S
): Promise<S> {
  return a.reduce(async (accP: Promise<S>, val: T, i: number, orig: Array<T>) => {
    const acc: S = await accP;
    return f(acc, val, i, orig);
  }, Promise.resolve(s));
}
