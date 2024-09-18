import * as crypto from 'crypto';

import type { SiteOMaticConfig } from './config/schemas/site-o-matic-config.schema';
import { MAX_SOM_ID_LEN, VERSION } from './consts';

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

export function formulateSomId(config: SiteOMaticConfig, domainName: string): string {
  const domainNameHash = calculateDomainHash(domainName);
  const normalizedDomainName = normalizeDomainName(domainName, config.SOM_PREFIX.length + domainNameHash.length + 4);

  return `${config.SOM_PREFIX}--${normalizedDomainName}--${domainNameHash}`;
}
