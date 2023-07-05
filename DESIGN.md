# Site-o-Matic

## Productize / Release
- Finish any outstanding small features/polishing
  - Minimal manifest example
    - ```
      { "rootDomainName": "example.com" }
      ```
    - No pipeline
      - `$ aws s3 sync . s3://wwwbucket-som--markus-dot-lol--b7047a/`
    - No extra DNS
  - Redirects
    - Edge func?
    - CNAME?
    - Do we need S3/etc? Certainly not pipeline.
  - Sub-domain hosting?
    a) Cf origin mapped to domain S3 bucket sub-folder?
      - Cannot be a child of www (root domain folder)
    b) Cf origin mapped to dedicated S3 bucket?
      - Can create bucket/mapping
      - But what are the implications for pipeline??
        - Too theoretical/YAGNI at the moment, stick with a)
  - What is the story with regions?
    - Is it always us-east-1 for everything?
    - Or should infra be deployed to a region of choice where possible?
      - Specified in manifest (optionally)
      - Pipeline?
      - CodeCommit?
      - CodeStar?
      - Route53?
      - User?
  - ???

- Remove content generation?
  - Keep in a branch
  - Rather have some template repos which can be used as boilerplate/examples/starters?
- Remove system/system?
- Create minimal manifest example

### Tests
- Unit:
  - lib
  - lib/aws
  - lib/content
  - lib/manifest
  - lib/registrar
  - lib/ui
- CDK:
  - system/aws/defs/siteomatic/hostedzone 
  - system/aws/defs/siteomatic/hosting 
  - system/aws/defs/siteomatic/pipeline 
  - system/aws/defs/siteomatic/site
  - system/aws/defs/siteomatic/site/substacks 
  - system/aws/bin [?]


### Docs
- README

- Overview / Purpose / Problem-Solution / General tech (CDK)
  - Own AWS account
  - S3
  - Cf
  - Route53 for DNS

- Getting started
  - Install
  - Credentials
  - Running
  - Manifest

- Concepts
  - Manifest
  - Hosting
    - WAF
  - Certificates
    - Certificate clones
  - DNS
  - Protected
  - Region
  - Secrets
  - Users
  - Keys
  - Registrars / Nameservers
  - Status display
  - Phases
  - VCS
    - CloudCommit
    - CodeStar connections
  - Pipeline
  - Cross-account access

- CLI reference
  - Reference description for all CLI commands/params

- HOWTOs
  - Minimal website with:
    - No certificate (?)
    - No Pipeline
      - Manual S3 deployment
  - "Standard" S3/Cf web site
    - Certificate
    - DNS
    - Nameservers
    - CodeCommit Pipeline
  - Node/Metalsmith S3/Cf site
    - Certificate
    - DNS
    - Nameservers
    - CodeStar connection
    - Github
  - Serverless API project with SOM site
    - ???
  - Subdomains
    - Is sub-domains purely a DNS thing?
      - Should we be able to specify:
        - sub-domain maps to sub-folder of domain S3 bucket?
        - sub-domain maps to own sub-domain S3 bucket?
---

## IMPORTANT

- Changing CDK version is very painful
  - Even minor versions which deprecate:
    - E.g. DnsValidatedCertificate -> Certificate
  - Inter-dependencies and slow stuff like Cloudfront make it tricky/impossible to upgrade
  - Only option is to destroy, then deploy
  - LESSON:
    - If such a change is needed, destroy first, then upgrade SOM/CDK, then re-deploy
      - Making changes, then trying to destroy can lead to dead-ends/inconsistent states
  - Added protections/checks for "current version vs deployed version"
    - This must be quite strong/strict for now
  - Add git tag for version
- Problem seems to be related to DNS/R53:
  - call `removeVerificationCnameRecords` for destroy
    - Maybe also need to remove other [non-SOA, non-???] records before destroy

---

## R r r r r r

- No, should be a "personal cloud tool"
  - Meaning: a tool for an individual to manage small-scale cloud stuff
    - Assumed to be "tech-savvy"
    - Assumed to be a developer who has some familiarity with (AWS) cloud
    - Wants something of a shortcut for doing own, custom CDK stacks for websites
- Does STT eat our lunch?
  - Already have templates for "website backed by S3", etc
    - Community driven and developed
    - Some stuff like registrar integration
      - Also, the multi-step nature of SOM, which allows for
        - Why do we need the multiple steps again?

## Deploying

1. Add an IAM user to deploy the site under, if the desired user does not exist
2. Upload your SSH public key to the IAM user, note the SSH key ID
3. Add line to ~/.ssh/config for convenience:
   ```
   Host git-codecommit.*.amazonaws.com
     User <SSH key ID>
     IdentityFile <path to SSH private key>
   ```
4. Add a secret for the registrar API key, if using: `a`
5. load <path to manifest>
6. deploy <username> -> `HostedZoneAwaitingNameserverConfig`
7. info
8. set nameservers -> `HostedZoneOk`
9. deploy <username> -> `SiteFunctional`
10. git add remote deploy <code-commit-clone-url-ssh>
11. ..._commit web content_...
12. git push deploy main

```

- 1. Seems like something that should be provided or is assumed?
  2. Deploy hosting but DNS is not yet associated with the new "server"
  3. DNS has been connected to the hosting
  4. Deploy other stuff like codeCommit pipeline/metalsmith/etc.
     - This depends on DNS being connected to the hosting
       - But why exactly?

## R r r r r

- Create a multi-tenant SaaS style system?
  - CLI becomes a client for this
- Lambdas will execute CDK to provision resources?
  - Is that a thing?
- https://docs.aws.amazon.com/cdk/v2/guide/cdk_pipeline.html
  - Have a pipeline which deploys CDK stacks
    - And a bunch of stacks, partitioned somehow by tenant?
      - Stack defs are predefined
      - Stack instances are created per tenant/domain
    - How to enforce that a tenant can only deploy own stack?
      - At the lowest, tightest possible level. Absolutely cannot be breached.
        - Even at the cost of UX/hassle/etc
    - Pipeline per tenant may be overkill?
      - Although it gives finer-grained control

## R r r r

- Add `help` command
  - Basic form: tells you the steps needed
  - Better: context aware help tells you next step
    - Also, how to reverse current step?
- Add `bootstrap` command which sets up basic infra
  - som-user
    - name can be a config somewhere, with default to som-user
  - ???
- Amend other commands to remove user param, assume internal bootstrapped user
  - ls keys
  - add key
  - del key
  - synth
  - deploy
- Add "plumbing" mode
  - i.e. JSON (?) output from commands
    - Also input?
  - Allow commands to be executed standalone, i.e. specify command and manifest, no need to first load manifest?
    - Would like to avoid a daemon?
    - Pave the way for a [GT]UI?
- So far the tool is stateless in terms of local machine
  - This is desirable
  - Possibly some kind of local caching could be added for efficiency?

## Reboot reboot reboot

- So far:
  - Vorpal cli UI
  - basic codecommit-s3 pipeline
  - almost a basic codecommit-npm-s3 pipeline
- Future:
  - "multi-tenancy"
    - first set up user
    - all domains use the same user
      - one SSH key for all sites?
    - nest ssm params/etc under userId
    - API key needed to use tool
- Solve the issue with "content producers"?
  - how to get the content into codecommit?
  - how to also get the content into S3, but only once?
- Do we want some other SCM sources?
  - github?
  - bitbucket?
  - gitlab?
- Do we want some other CI/CD tools?
  - Github actions
  - Travis
  - Jenkins
  - Codeship
  - Drone.io
  - etc.

## Reboot reboot

### CLI

- ~~Make it terraform based?!~~
- Own cli to control various possible "infrastructure providers"
- UI:
  - `list`: list domains available in the manifest
  - `prepare`: intermediate stage?
  - `deploy`: (prepare and) deploy the given stack
  - `info`: show info/outputs for given stack
  - `destroy`: destroy the given stack

### Build

- Codebuild/codedeploy pipeline?
  - push to `main` branch -> build -> deploy to prod
  - push to `preview` branch -> build -> deploy to dev
  - build:
    - run metalsmith and generate build directory -> artefact
  - deploy:
    - sync artefact to S3 bucket

## Reboot

- Make it CDK based?
  - Have a descriptor/manifest file (YAML)
    - manifest describes one or more "site" objects
    - each "site" object has the properties needed to create the site
    - CDK loops over each site and instantiates a SomSiteStack
    - use CDK to synth/deploy
  - CDK diff can be used to see what exists vs manifest?

## Features

- Multi-tenant (?)
  - Each user must only be able to see/interact with their own sites
  - Infrastructure wise, they are all in the site-o-matic account?

## TODO

- HTTP + HTTPS for cloudfront
- Cert for dev.domain.tld
- Deploy for dev/prod <= dev/master branch
- Docker image for CodeBuild with more runtimes (python3, ruby, go, ...)
- Add codebuild badge to default index.html template
- Rename letstencrypt.sh -> certbot.sh
- Remove DNS records manually before deleting cf stack?
- Keep codecommit repo when deleting stack?
  - Or create it outside of cf?
- Reflect CodeBuild status in info screen?
  - Also reflect cloudfront status?
- Use AWS ACM for certificates?
- Docs
  - README
  - Step-by-step instructions
- error handling review
- output handling review
  - colour?
  - json?
- SNS notifications when stack has completed CREATE/DELETE?
  x re-org templates dir
  x add region support for all commands
  x assume CodeCommitFullControl policy for user

# Requirements

- Python 3 (?)

  - to run the SOM script/system

- AWS Account

  - Credentials with PowerUser privileges
    - Least Privilege is the tricky part here
      - but desirable, see: (IAM book)
  - Other cloud(s)?
    - Not for now

- CircleCi account (?)

  - What about:
    - AWS CodeBuild (\*)
    - Travis
    - Jenkins
    - Codeship
    - Drone.io
    - etc.

- Github account (?)
  - What about:
    - AWS CodeCommit (\*)
    - Gitlab
    - Bitbucket
    - etc.
  - NOTE: CircleCi only supports Github and Bitbucket

### Initial Support

- AWS
- CodeBuild + CodeCommit
- Then maybe:
  - Github Actions + Github

## Process

1. Create a AWS Cloudformation stack file (naming of this?)
2. Run file to create AWS Cloudformation stack
   -> Outputs

3. Create github repo with placeholder content

   - Could be plugin
   - OR: Cloudformation stack has already created a CodeCommit repo?

4. Create CircleCi project for github repo

   - Could be plugin
   - OR: Cloudformation stack has already created a CodeBuild project?

5. Commit to git repo
   -> CI
   -> Letsencrypt cert is created

6. What about cert renewal?
   - Create a lambda to renew cert?

## Notes

- Use 'SOM-' prefix for assets
  - Can read assets from AWS to determine list of existing sites?
    - E.g. read all S3 buckets starting with prefix (under the given account)
- Add a random element to naming to avoid collisions

  - Esp. for S3 buckets

- Make Cloudfront logging optional

  - Could have a command to toggle it on/off
  - Is there a way to query AWS to read this state?
  - Does the logging need a separate bucket?

- Templates for different kinds of content?

  - e.g. Middleman?
  - Metalsmith

- Use AWS ACM SSL certs rather than letsencrypt (?)
  - note this requires cert to be issued in the eu-east-1 region
    - therefore always use this region?
- Multiple account setup?
  - development and production accounts
  - development:
    - codecommit
    - codebuild
    - dev S3 bucket
    - dev Cloudfront
  - production:
    - prod S3 bucket
    - prod Cloudfront
    - Route53?
- Support wildcard certs?

  - Is this even possible with S3?

- make hardcoded values into options?
  - codecommit email address
  - ???
- allow to run som.py with "spec file" to provide params
  - domain, etc
- TUI?
- QT UI?

## UI

- global options

  - aws-profile
    - string

- list: list existing som stacks

- info: display details about an existing som stack

  - stack-name
    - string, required

- create: create a new som stack

  - domain-name
    - string, required
  - template
    - string, optional, default: plain_html

- remove: remove a som stack and associated assets
  - domain-name
    - string, required

# Multi-tenant

- Is this something that we want?

  - As in, possible to be a SaaS?

    - Create an account
      - Have own SOM sites
    - Sounds like a security minefield

  - Or rather, A tool to operate your own "s-o-m", on your own infra?
    - Could eventually be multi-cloud
      - AWS
      - GCP
      - Azure?
      - Redhat?
```
