import { calculateDomainHash, normalizeDomainName, SOM_PREFIX } from '../../../../../lib';

export function formulateStackName(domainName: string) {
  const domain_name_hash = calculateDomainHash(domainName);
  const normalized_domain_name = normalizeDomainName(domainName, SOM_PREFIX.length + domain_name_hash.length + 4);

  return `${SOM_PREFIX}--${normalized_domain_name}--${domain_name_hash}--hosting`;
}
