import * as crypto from 'crypto';
import * as cdk from '@aws-cdk/core';

export const SOM_PREFIX = 'som';
export const SOM_TAG_NAME = 'Site-o-Matic';

export const DEFAULT_STACK_PROPS: cdk.StackProps = {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
};

export function calculateDomainHash(domainName: string) {
  return crypto.createHash('md5').update(domainName).digest('hex').slice(0, 6);
}

export function normalizeDomainName(domainName: string) {
  return domainName.replace('.', '-dot-');
}
