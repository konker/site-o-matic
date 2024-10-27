import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { findHostedZoneAttributes } from '../../../../lib/aws/route53';
import { toSsmParamName } from '../../../../lib/aws/ssm';
import {
  REGISTRAR_ID_AWS_ROUTE53,
  SSM_PARAM_NAME_HOSTED_ZONE_ID,
  SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS,
  SSM_PARAM_NAME_IS_AWS_ROUTE53_REGISTERED_DOMAIN,
} from '../../../../lib/consts';
import * as awsRoute53Registrar from '../../../../lib/registrar/connectors/aws-route53';
import { EMPTY_SECRETS_SETS_COLLECTION } from '../../../../lib/secrets';
import { _id, _somMeta } from '../../../../lib/utils';
import type { SiteResourcesStack } from './SiteStack/SiteResourcesStack';

// ----------------------------------------------------------------------
export type HostedZoneResources = {
  readonly hostedZone: route53.IHostedZone;
  readonly verificationRecord: route53.TxtRecord;
  readonly ssmParams: Array<ssm.StringParameter>;
};

// ----------------------------------------------------------------------
export async function build(siteResourcesStack: SiteResourcesStack): Promise<HostedZoneResources> {
  if (!siteResourcesStack.domainUserResources?.domainUser) {
    throw new Error('[site-o-matic] Could not build hosted zone resources when domainUser is missing');
  }

  // ----------------------------------------------------------------------
  // DNS HostedZone
  const hostedZone = await (async () => {
    // Try to detect if an existing HostedZone exists with an SOA record
    const hostedZoneAttributes = await findHostedZoneAttributes(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.rootDomainName
    );

    // Special case for AWS Route53 registrar, as we expect this to be automatically created when the domain is registered
    if (siteResourcesStack.siteProps.context.manifest.registrar === REGISTRAR_ID_AWS_ROUTE53) {
      if (!hostedZoneAttributes?.zoneName || !hostedZoneAttributes.hostedZoneId) {
        throw new Error(`[site-o-matic] Could not resolve existing hosted zone for AWS Route53 registered domain`);
      }
    }

    // This determines whether we create a new HostedZone or use an existing one
    if (hostedZoneAttributes) {
      const ret = route53.HostedZone.fromHostedZoneAttributes(
        siteResourcesStack,
        'ExistingHostedZone',
        hostedZoneAttributes
      );
      if (!ret.hostedZoneNameServers) {
        // Polyfill in the nameservers, clobber readonly attribute with any keyword
        // Only because CDK doesn't instantiate this fully via fromHostedZoneAttributes
        (ret as any).hostedZoneNameServers = await awsRoute53Registrar.getNameServers(
          siteResourcesStack.siteProps.config,
          EMPTY_SECRETS_SETS_COLLECTION,
          siteResourcesStack.siteProps.context.rootDomainName
        );
      }

      return ret;
    } else {
      const ret = new route53.PublicHostedZone(
        siteResourcesStack,
        _id('HostedZone', siteResourcesStack.rootDomainName),
        {
          zoneName: siteResourcesStack.rootDomainName,
        }
      );
      _somMeta(siteResourcesStack.siteProps.config, ret, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);
      return ret;
    }
  })();

  // ----------------------------------------------------------------------
  // Add basic list permissions to the domain policy
  siteResourcesStack.domainUserResources.domainUserPolicy.addStatements(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'], //[FIXME: tighten with conditions clause which specifies ARN?]
      actions: ['route53:ListHostedZones', 'route53:GetHostedZoneCount', 'route53:ListHostedZonesByName'],
    })
  );

  // ----------------------------------------------------------------------
  // Internal validation resource
  const verificationRecord = new route53.TxtRecord(siteResourcesStack, 'DnsRecordSet_TXT_Som', {
    zone: hostedZone,
    recordName: '_som',
    values: [hostedZone.hostedZoneId.toString()],
  });
  _somMeta(
    siteResourcesStack.siteProps.config,
    verificationRecord,
    siteResourcesStack.somId,
    siteResourcesStack.siteProps.locked
  );

  // ----------------------------------------------------------------------
  // SSM Params, only create for the top level
  const ssm1 = new ssm.StringParameter(siteResourcesStack, _id('SsmHostedZoneId', siteResourcesStack.rootDomainName), {
    parameterName: toSsmParamName(
      siteResourcesStack.siteProps.config,
      siteResourcesStack.somId,
      SSM_PARAM_NAME_HOSTED_ZONE_ID
    ),
    stringValue: hostedZone.hostedZoneId,
    tier: ssm.ParameterTier.STANDARD,
  });
  _somMeta(siteResourcesStack.siteProps.config, ssm1, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const ssm2 = new ssm.StringParameter(
    siteResourcesStack,
    _id('SsmHostedZoneNameServers', siteResourcesStack.rootDomainName),
    {
      parameterName: toSsmParamName(
        siteResourcesStack.siteProps.config,
        siteResourcesStack.somId,
        SSM_PARAM_NAME_HOSTED_ZONE_NAME_SERVERS
      ),
      stringValue: cdk.Fn.join(',', hostedZone.hostedZoneNameServers ?? []),
      tier: ssm.ParameterTier.STANDARD,
    }
  );
  _somMeta(siteResourcesStack.siteProps.config, ssm2, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  const ssm3 = new ssm.StringParameter(
    siteResourcesStack,
    _id('SsmIsAwsRoute53RegisteredDomain', siteResourcesStack.rootDomainName),
    {
      parameterName: toSsmParamName(
        siteResourcesStack.siteProps.config,
        siteResourcesStack.somId,
        SSM_PARAM_NAME_IS_AWS_ROUTE53_REGISTERED_DOMAIN
      ),
      stringValue: 'true',
      tier: ssm.ParameterTier.STANDARD,
    }
  );
  _somMeta(siteResourcesStack.siteProps.config, ssm3, siteResourcesStack.somId, siteResourcesStack.siteProps.locked);

  return {
    hostedZone,
    verificationRecord,
    ssmParams: [ssm1, ssm2, ssm3],
  };
}
