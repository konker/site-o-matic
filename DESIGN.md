# Site-o-Matic
------------------------------------------------------------------------------

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

## Reboot reboot
### CLI
- Make it terraform based?!
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
    - Other cloud(s)?

- CircleCi account (?)
    - What about:
        - AWS CodeBuild (*)
        - Travis
        - Jenkins
        - Codeship
        - Drone.io
        - etc.

- Github account (?)
    - What about:
        - AWS CodeCommit (*)
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
1) Create a AWS Cloudformation stack file (naming of this?)
2) Run file to create AWS Cloudformation stack
    -> Outputs

3) Create github repo with placeholder content
    - Could be plugin
    - OR: Cloudformation stack has already created a CodeCommit repo?

4) Create CircleCi project for github repo
    - Could be plugin
    - OR: Cloudformation stack has already created a CodeBuild project?

5) Commit to git repo
    -> CI
        -> Letsencrypt cert is created

6) What about cert renewal?
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
    

