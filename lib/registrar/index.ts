import * as dynadot from './connectors/dynadot';
import { RegistrarConnector } from './connectors';

export function getRegistrarConnector(id: string): RegistrarConnector {
  switch (id) {
    case dynadot.ID:
      return dynadot;
    default:
      throw new Error(`Could not get RegistrarConnector for ${id}`);
  }
}
