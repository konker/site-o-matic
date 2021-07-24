import { calculateDomainHash, normalizeDomainName, SOM_PREFIX } from '../common';

export function formulateStackName(domainName: string) {
  const domain_name_hash = calculateDomainHash(domainName);
  const normalized_domain_name = normalizeDomainName(domainName);

  return `${SOM_PREFIX}--0--${domain_name_hash}--${normalized_domain_name}--hosted-zone`;
}
