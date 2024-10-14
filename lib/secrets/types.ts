export const SECRETS_SOURCE_SECRETS_MANAGER = 'secretsmanager';
export const SECRETS_SOURCE_SSM = 'ssm';

export type SecretsSource = typeof SECRETS_SOURCE_SECRETS_MANAGER | typeof SECRETS_SOURCE_SSM;

export type SecretsPlain = Record<string, string>;

export type SecretsSet = {
  readonly source: SecretsSource;
  readonly scope: string;
  readonly secretsPlain: SecretsPlain;
};

export type SecretsSetCollection = {
  readonly secretsSets: Array<SecretsSet>;
  readonly lookup: Record<string, string>;
};

export type Secret = {
  readonly name: string;
  readonly value: string;
};
