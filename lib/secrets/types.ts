export const SECRETS_SOURCE_SSM = 'ssm' as const;
export const SECRETS_SOURCE_SECRETS_MANAGER = 'secretsmanager' as const;

export type SecretsSource = typeof SECRETS_SOURCE_SSM | typeof SECRETS_SOURCE_SECRETS_MANAGER;

export const ALL_SECRETS_SOURCES = [SECRETS_SOURCE_SSM, SECRETS_SOURCE_SECRETS_MANAGER] as const;
export const DEFAULT_SECRETS_SOURCE: SecretsSource = SECRETS_SOURCE_SSM;

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
