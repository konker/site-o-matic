import * as crypto from 'crypto';

import type { SiteOMaticConfig } from './config/schemas/site-o-matic-config.schema';
import { MAX_SOM_ID_LEN } from './consts';

export function calculateDomainHash(domainName: string) {
  return crypto.createHash('md5').update(domainName).digest('hex').slice(0, 6);
}

export function normalizeDomainName(
  domainName: string,
  reservedLength: number,
  maxLength: number = MAX_SOM_ID_LEN
): string {
  return domainName.replaceAll(/\./g, '-dot-').slice(0, maxLength - reservedLength);
}

export function formulateSomId(config: SiteOMaticConfig, domainName: string): string {
  const domainNameHash = calculateDomainHash(domainName);
  const normalizedDomainName = normalizeDomainName(domainName, config.SOM_PREFIX.length + domainNameHash.length + 4);

  return `${config.SOM_PREFIX}--${normalizedDomainName}--${domainNameHash}`;
}
