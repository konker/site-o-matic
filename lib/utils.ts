import type { TerraformStack } from 'cdktf';
import type { IConstruct } from 'constructs';
import Handlebars from 'handlebars';

import type { SiteStack } from '../system/aws/defs/siteomatic/SiteStack';
import type { SiteOMaticConfig } from './config/schemas/site-o-matic-config.schema';
import type { SomFunctionFragmentProducerDef } from './edge';
import type { HasManifest, SomContext, SomParam } from './types';

export function getParam(params: Array<SomParam> | undefined, name: string): string | undefined {
  return params?.find((i: any) => i.Param === name)?.Value;
}

export function nsRecordValueToHost(value: string): string {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

export function getContextParam(context: SomContext, name: string): string | undefined {
  return getParam(context?.params, name);
}

export function _id(prefix: string, postfix: string, isRoot = true): string {
  return isRoot ? prefix : `${prefix}-${postfix}`;
}

// Not all constructs are taggable, so we need to filter it
type TaggableConstruct = IConstruct & {
  tags?: Record<string, string>;
  tagsInput?: Record<string, string>;
};

function isTaggableConstruct(x: IConstruct): x is TaggableConstruct {
  return 'tags' in x && 'tagsInput' in x;
}

/**
 * @deprecated: use https://developer.hashicorp.com/terraform/cdktf/concepts/aspects
 */
export function _somTag(
  config: SiteOMaticConfig,
  resource: IConstruct | TerraformStack,
  somId: string,
  _protected: boolean
) {
  if (isTaggableConstruct(resource)) {
    resource.tags = {
      ...resource.tags,
      [config.SOM_TAG_NAME]: somId,
    };
  }
}

export function _somTags(siteStack: SiteStack) {
  return {
    [siteStack.siteProps.config.SOM_TAG_NAME]: siteStack.siteProps.context.somId,
  };
}

export async function asyncCreateEmptyObject() {
  return {};
}

export function matchArraySorting<T>(sorted: ReadonlyArray<T>) {
  return function (arr: ReadonlyArray<T>): ReadonlyArray<T> {
    return [...arr].sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));
  };
}

export function matchArraySortingFragmentProducerDefs(sorted: ReadonlyArray<string>) {
  return function <T, C extends SomFunctionFragmentProducerDef<T>>(arr: ReadonlyArray<C>): ReadonlyArray<C> {
    return [...arr].sort((a, b) => sorted.indexOf(a.id) - sorted.indexOf(b.id));
  };
}

export function contextTemplateString(s: string | undefined, context: HasManifest<SomContext>): string | undefined {
  if (!s) return undefined;

  const compliedTemplate = Handlebars.compile(s);
  return compliedTemplate({ context });
}

export function formulateIamUserName(somId: string, prefix: string): string {
  return `${prefix}_${somId}`.replace(/--/g, '_').replace(/-/g, '_');
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function fqdn(domainName: string): string {
  return domainName.endsWith('.') ? domainName : domainName + '.';
}
