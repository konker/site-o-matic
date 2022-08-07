import { SomState } from './consts';

export function getParam(state: SomState, name: string): string | undefined {
  return state.params?.find((i: any) => i.Param === name)?.Value;
}

export function _id(prefix: string, domainName: string, isRoot: boolean): string {
  return isRoot ? prefix : `${prefix}-${domainName}`;
}
