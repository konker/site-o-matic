import type { Resource, Stack } from 'aws-cdk-lib';
import { RemovalPolicy, Tags } from 'aws-cdk-lib';
import Handlebars from 'handlebars';

import type { CertificateResources, HasManifest, SomConfig, SomContext, SomParam } from './types';

export function getParam(params: Array<SomParam> | undefined, name: string): string | undefined {
  return params?.find((i: any) => i.Param === name)?.Value;
}

export function nsRecordValueToHost(value: string): string {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

export function getContextParam(context: SomContext, name: string): string | undefined {
  return getParam(context?.params, name);
}

export function _id(prefix: string, domainName: string, isRoot: boolean): string {
  return isRoot ? prefix : `${prefix}-${domainName}`;
}

export function _removalPolicyFromBoolean(protect: boolean): RemovalPolicy {
  return protect ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
}

export function _somRemovalPolicy(resource: Resource, protect: boolean) {
  resource.applyRemovalPolicy(_removalPolicyFromBoolean(protect));
}

export function _somTag(config: SomConfig, resource: Resource | Stack, somId: string) {
  Tags.of(resource).add(config.SOM_TAG_NAME, somId);
}

export function _somMeta(config: SomConfig, resource: Resource, somId: string, protect: boolean) {
  _somRemovalPolicy(resource, protect);
  _somTag(config, resource, somId);
}

export function matchArraySorting<T>(sorted: Array<T>) {
  return function (arr: Array<T>): Array<T> {
    return [...arr].sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));
  };
}

export function contextTemplateString(s: string | undefined, context: HasManifest<SomContext>): string | undefined {
  if (!s) return undefined;

  const compliedTemplate = Handlebars.compile(s);
  return compliedTemplate({ context });
}

export function searchCertificates(
  certificateResources: CertificateResources | undefined,
  domainName: string
): CertificateResources | undefined {
  if (certificateResources?.domainName === domainName) return certificateResources;
  for (const subResources of certificateResources?.subdomainResources ?? []) {
    const res = searchCertificates(subResources, domainName);
    if (res) return res;
  }
  return undefined;
}
