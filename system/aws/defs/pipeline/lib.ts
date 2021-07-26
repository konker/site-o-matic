import { calculateDomainHash, normalizeDomainName, SOM_PREFIX } from '../common';
import {ContentPipelineType} from "../../../../content";

export function formulateStackName(domainName: string, type: ContentPipelineType) {
  const domain_name_hash = calculateDomainHash(domainName);
  const normalized_domain_name = normalizeDomainName(domainName);

  return `${SOM_PREFIX}--2--${domain_name_hash}--${normalized_domain_name}--${type}--pipeline`;
}
