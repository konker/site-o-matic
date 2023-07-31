import type { Resource, Stack } from 'aws-cdk-lib';
import { RemovalPolicy, Tags } from 'aws-cdk-lib';

import { SOM_TAG_NAME } from './consts';
import type { SomContext } from './types';

export function getParam(context: SomContext, name: string): string | undefined {
  return context.params?.find((i: any) => i.Param === name)?.Value;
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

export function _somTag(resource: Resource | Stack, somId: string) {
  Tags.of(resource).add(SOM_TAG_NAME, somId);
}

export function _somMeta(resource: Resource, somId: string, protect: boolean) {
  _somRemovalPolicy(resource, protect);
  _somTag(resource, somId);
}

export function matchArraySorting<T>(sorted: Array<T>) {
  return function (arr: Array<T>): Array<T> {
    return [...arr].sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));
  };
}
