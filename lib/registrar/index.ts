import type { SomConfig } from '../types';
import * as dynadot from './connectors/dynadot';

export type RegistrarConnector = {
  ID: string;
  SECRETS: Array<string>;

  getNameServers(
    config: SomConfig,
    secrets: { [key: string]: string },
    domain: string
  ): Promise<Array<string> | undefined>;
  setNameServers(
    config: SomConfig,
    secrets: { [key: string]: string },
    domain: string,
    hosts: Array<string>
  ): Promise<Array<string> | undefined>;
};

export function getRegistrarConnector(id: string): RegistrarConnector {
  switch (id) {
    case dynadot.ID:
      return dynadot;
    default:
      throw new Error(`Could not get RegistrarConnector for ${id}`);
  }
}
