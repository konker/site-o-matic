import type { RegistrarConnector } from './connectors';
import * as dynadot from './connectors/dynadot';

export function getRegistrarConnector(id: string): RegistrarConnector {
  switch (id) {
    case dynadot.ID:
      return dynadot;
    default:
      throw new Error(`Could not get RegistrarConnector for ${id}`);
  }
}
