# site-o-matic.tf
-----------------------------------------------------------------------------
Port of site-o-matic to cdktf (from standard cdk)

## Strategy for Port
- Attempt single stack
- Amend somMetadata helper to work with cdktf, if needed
- First: gather regions, and instantiate providers:
  - regionUsEast1, regionManifest
  - These become part of site props
- Copy builder code, like for like
  - Convert to cdktf equivalent resources
    - Adapt properties
  - Explicitly include appropriate provider with each resource
- Amend cdkExec for cdktf command/params
  - Could have cdkTfExec in parallel?
- See what happens!
- Other:
  - Possibly start without content?
  - Review purpose of domainUser?
    - Seems it is not needed, therefore choose domainUser or domainPublisher and consolidate
      - call it domainUser, but give it the current permissions of domainPublisher

## Analysis
- PRO: Allows for different resources to be in different regions, in the same stack/deployment
  - Allows e.g.: Route53(global), CertificateManager(us-east-1), S3(eu-west-1)
    - i.e. site resources are in a desired/specified region, except for those which _must_ be in another region (or are global/region agnostic)
      - ~~Could we even have more than one manifest region?! E.g. bucket in eu-west-1,~~ 
- PRO: Allows for programmatic creation of SecureString SSM params (impossible in CDK)
- PRO: Eliminates multiple-deployment setup, bootstrap stack -> certificates stack -> resources stack
- CON: Resources are no longer self-contained in a Cloudformation stack(s)
  - Check TF facilities for grouping/discovering resources?
  - Does the TF metadata represent a "stack" in the sense of keeping track of resources?
  - Create a tag scheme which will allow for direct identification of related resources
    - Do this anyway?
- CON: Is the TF/HCL which defines the resources "hidden" inside cdktf?
  - Could it be e.g. extracted to be vanilla TF?
    - JSON representation of TF is synthesized (I believe), and persisted?
  - Is there some question of "local vs remote" tracking of metadata?
    - Could AWS have some kind of self-hosted version of the "remote" option?
      - As opposed to using a TF cloud service
  - Do we care?

- So far, PRO > CON
  - Will need to check if all resources are supported (seems so, nothing that exotic anyway)

## Resources
- domainUser: iam.User // What is this for actually? Check.
- domainUserPolicy: iam.Policy
- ssmDomainUserName: string
- domainPublisher: iam.User
- domainPublisherAccessKey: iam.AccessKey
- ssmDomainPublisherUserName
- ssmDomainPublisherAccessKeySecretIdSecret: SecureString
- ssmDomainPublisherAccessKeySecretIdSecretName
- ssmDomainPublisherAccessKeySecretSecretSecret: SecureString
- ssmDomainPublisherAccessKeySecretSecretSecretName
- ssmSiteEntryRootDomainName
- ssmSiteEntrySomId
- ssmRootDomain // Change to ssmRootDomainName ?
- ssmWebmasterEmail
- ssmProtectedStatus
- ssmSomVersion
- hostedZone: route53.HostedZone
- iam.PolicyStatement
- verificationRecord: route53.TxtRecord
- ssmHostedZoneId
- ssmHostedZoneNameServers
- ssmIsAwsRoute53RegisteredDomain
- route53.RecordSet
- route53.MxRecord
- route53.CnameRecord
- route53.TxtRecord
- domainBucket: s3.Bucket
- originAccessControl: cloudfront.CfnOriginAccessControl // !!?
- ssmDomainBucketName
- notificationsSnsTopic: sns.Topic
- ssmSnsTopicName
- ssmSnsTopicArn
- ForEach webHosting:
  - certificate: certificatemanager.Certificate
    - // Possible certificate clones here?
  - SsmDomainCertificateArn-${postfix}
  - functions: Array<cloudfront.Function>
    - // NOTE: requires loader
  - s3OriginWithOacPatch // !!?
  - responseHeadersPolicy: cloudfront.ResponseHeadersPolicy
  - cloudfrontDistribution: cloudfront.Distribution
  - cachePolicy: cloudfront.CachePolicy
  - route53.ARecord
  - route53.AaaaRecord
  - s3Deployment.BucketDeployment
    - // NOTE: requires loader
  - ssmCloudfrontDistributionId
  - ssmCloudfrontDomainName

### Notes
- Biggest questions are around OAC?
