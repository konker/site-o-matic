import * as crypto from 'crypto';

import { MAX_SOM_ID_LEN, SOM_PREFIX, VERSION } from './consts';

export function calculateDomainHash(domainName: string) {
  return crypto
    .createHash('md5')
    .update(domainName + VERSION)
    .digest('hex')
    .slice(0, 6);
}

export function normalizeDomainName(domainName: string, reservedLength: number): string {
  return domainName.replace('.', '-dot-').slice(0, MAX_SOM_ID_LEN - reservedLength);
}

export function formulateSomId(domainName: string): string {
  const domain_name_hash = calculateDomainHash(domainName);
  const normalized_domain_name = normalizeDomainName(domainName, SOM_PREFIX.length + domain_name_hash.length + 4);

  return `${SOM_PREFIX}--${normalized_domain_name}--${domain_name_hash}`;
}
