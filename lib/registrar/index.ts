import type { SiteOMaticConfig } from '../config/schemas/site-o-matic-config.schema';
import type { SiteOMaticManifest } from '../manifest/schemas/site-o-matic-manifest.schema';
import type { SecretsSetCollection } from '../secrets/types';
import * as awsRoute53 from './connectors/aws-route53';
import * as dynadot from './connectors/dynadot';

export type RegistrarConnector = {
  ID: string;
  SECRETS: Array<string>;

  getNameServers(
    config: SiteOMaticConfig,
    manifest: SiteOMaticManifest,
    secrets: SecretsSetCollection,
    domain: string
  ): Promise<Array<string>>;
  setNameServers(
    config: SiteOMaticConfig,
    manifest: SiteOMaticManifest,
    secrets: SecretsSetCollection,
    domain: string,
    hosts: Array<string>
  ): Promise<Array<string> | undefined>;
};

export function getRegistrarConnector(id: string): RegistrarConnector {
  switch (id) {
    case dynadot.ID:
      return dynadot;
    case awsRoute53.ID:
      return awsRoute53;
    default:
      throw new Error(`Could not get RegistrarConnector for ${id}`);
  }
}
