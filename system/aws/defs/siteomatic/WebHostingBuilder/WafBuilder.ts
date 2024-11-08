import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

import type { WebHostingClauseWithResources } from '../../../../../lib/manifest/schemas/site-o-matic-manifest.schema';
import type { SiteResourcesStack } from '../SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type WafResources =
  | {
      readonly wafEnabled: false;
    }
  | { readonly wafEnabled: true; readonly wafAcl: wafv2.CfnWebACL };

// ----------------------------------------------------------------------
export async function build(
  siteResourcesStack: SiteResourcesStack,
  webHostingSpec: WebHostingClauseWithResources
): Promise<WafResources> {
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build WAF resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  // WAF ACl
  const awsManagedRules = webHostingSpec.waf?.AWSManagedRules;
  const wafEnabled = !!webHostingSpec.waf?.enabled && awsManagedRules && awsManagedRules.length > 0;

  if (!wafEnabled) {
    return { wafEnabled: false };
  }

  const wafAcl = new wafv2.CfnWebACL(siteResourcesStack, 'WafAcl', {
    defaultAction: { allow: {} },
    scope: 'CLOUDFRONT',
    visibilityConfig: {
      cloudWatchMetricsEnabled: false,
      sampledRequestsEnabled: true,
      metricName: `${webHostingSpec.domainName}-wafAcl`,
    },
    rules: awsManagedRules.map((rule) => ({
      name: rule.name,
      priority: rule.priority,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: rule.name,
        },
      },
      overrideAction: { none: {} },
      visibilityConfig: {
        metricName: `${webHostingSpec.domainName}-AWSManagedRules`,
        cloudWatchMetricsEnabled: false,
        sampledRequestsEnabled: true,
      },
    })),
    tags: [
      { key: siteResourcesStack.siteProps.config.SOM_TAG_NAME, value: siteResourcesStack.siteProps.context.somId },
    ],
  });

  return { wafEnabled: true, wafAcl };
}
