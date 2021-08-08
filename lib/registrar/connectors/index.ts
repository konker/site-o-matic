export interface RegistrarConnector {
  ID: string;
  SECRETS: Array<string>;

  getNameServers(secrets: { [key: string]: string }, domain: string): Promise<Array<string>>;
  setNameServers(secrets: { [key: string]: string }, domain: string, hosts: Array<string>): Promise<Array<string>>;
}
