import { calculateDomainHash, normalizeDomainName, SOM_PREFIX } from '../../../../../lib';
import { ContentPipelineType } from '../../../../../content';

export function formulateStackName(domainName: string, type: ContentPipelineType) {
  const domain_name_hash = calculateDomainHash(domainName);
  const normalized_domain_name = normalizeDomainName(domainName, SOM_PREFIX.length + domain_name_hash.length + 4);

  return `${SOM_PREFIX}--${normalized_domain_name}--${domain_name_hash}--${type}--pipeline`;
}
