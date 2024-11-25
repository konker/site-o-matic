# site-o-matic.tf

---

Port of site-o-matic to cdktf (from standard cdk)

## TODO

- Content, make sure it is generated before aws cli upload is called
- Prompt for secretsAdd secret value to avoid writing secrets in history

- Upgrade all sites to 0.0.4

  - In reverse-importance order:
    X konker.dev
    - morningwoodsoftware.com
    - konradmarkus.com

- Add GitHub action examples for:

  - astro build, dist -> www
  - general node workflow: checkout, install node, pnpm install, pnpm run build, deploy $dist -> $www, invalidate Cf

- Have a clear idea about `tfstate`

  - What happens if you delete this from the local machine?
    - In the old days, there was cloudformation stacks regardless, and you could delete those
  - Should this be backed up? A first-class asset in SCM? Synced to cloud? Something else?
    - This is in the realms of terraform best practices..?

- `site-o-matic/metadata.json`

  - Automatically push this to the root of the S3 bucket
  - Basically, information from the manifest
    - Could it even have deploy-time data?
      - If it was pushed at deploy-time, then no.
      - If it was pushed as a manual command, then yes, via ssm params

- Unit tests for everything
- Documentation
  - konker.dev

## Strategy for Port

- Mark global secrets in listing
  - Also mark SM vs SSM?
- Remove pipeline, certificate clones from schemas and examples
- global scope secrets not showing?
- Remove pipeline stuff
- Remove certificate clones
- Refactor action code files to match, e.g. listSites -> sitesList [?]
- Prune old actions
  - Codestar
  - keys
- No cf functions if subComponentIds.length === 0
- No cf functions for https type
- Check destroy
- Check HTTPS Cf deployment
- Set up CI with access key and see if it works
- Check SNS topic
- Check SNS topic subscription
- Check subdomains
- Other deployment regions
- Content upload flip-flopping (upload/delete)
- Access key + secrets
- S3 bucket block public access all
- Cf access denied to S3 [?]
- Check Cf functions
- Check extra DNS, e.g. MX records
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
