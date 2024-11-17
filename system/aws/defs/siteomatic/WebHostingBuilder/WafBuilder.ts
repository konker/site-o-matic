import { WafWebAcl } from '@cdktf/provider-aws/lib/waf-web-acl';

import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import { _somTags } from '../../../../../lib/utils';
import type { SiteStack } from '../SiteStack';

// ----------------------------------------------------------------------
export type WafResources =
  | {
      readonly wafEnabled: false;
    }
  | { readonly wafEnabled: true; readonly wafAcl: WafWebAcl };

// ----------------------------------------------------------------------
export async function build(
  siteStack: SiteStack,
  webHostingSpec: WebHostingClauseWithResources,
  localIdPostfix: string
): Promise<WafResources> {
  const awsManagedRules = webHostingSpec.waf?.AWSManagedRules;
  const wafEnabled = !!webHostingSpec.waf?.enabled && awsManagedRules && awsManagedRules.length > 0;

  if (!wafEnabled) {
    return { wafEnabled: false };
  }

  // ----------------------------------------------------------------------
  // WAF ACl
  const wafAcl = new WafWebAcl(siteStack, `WafAcl-${localIdPostfix}`, {
    name: `WafAcl-${localIdPostfix}`,
    metricName: `${webHostingSpec.domainName}-WAF`,
    defaultAction: { type: 'allow' },
    rules: awsManagedRules.map((rule) => ({
      ruleId: rule.name,
      name: rule.name,
      priority: rule.priority,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: rule.name,
        },
      },
      overrideAction: { type: 'none' },
      visibilityConfig: {
        metricName: `${webHostingSpec.domainName}-WAF`,
        cloudWatchMetricsEnabled: false,
        sampledRequestsEnabled: true,
      },
    })),
    provider: siteStack.providerManifestRegion,
    tags: _somTags(siteStack),
  });

  return { wafEnabled: true, wafAcl };
}
