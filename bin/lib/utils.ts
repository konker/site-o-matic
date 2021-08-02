import { SomState } from '../../lib/consts';

export function getParam(state: SomState, name: string): string | undefined {
  return state.params?.find((i: any) => i.Param === name)?.Value;
}
