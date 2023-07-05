# Site-O-Matic User Manual
-----------------------------------------------------------------------------

[*] OSS: could be extended by contributions from open source project

User manual for the Site-O-Matic personal cloud website tool.

## What is Site-O-Matic?
In a nutshell: A personal tool for provisioning a website on AWS cloud infrastructure.

### Assumptions
- Quite web savvy [?]
- Have own AWS account, and are familiar with authorizing a shell session
- Static or SSG website
- Stored on S3
  - TODO: encryption, replication(?), protection?
- DNS via AWS Route53
  - Requires connection/integration with domain registrar
- Served via Cloudfront
  - TODO: geographies, caching(?), ???
  - Can have WAF enabled
    - Currently only AWS managed rules are supported
- Certificates via AWS Certificate Manager
- Built via Codepipeline
  - S3 pipeline: just copy source to S3 and invalidate Cloudfront
  - 'Custom' pipeline: run some build commands before copying to S3 and invalidating Cloudfront
    - Commands are assumed to exist with Codepipeline stage(?) environments/images/what do you call it?
      - NPM
      - Python? Ruby? Not clear.
    - All we know so far:
      - npm install
      - npm build
    - Something OSS could help with
  - Sources can be:
    - CodeCommit git repo
      - Auto provisioned by SOM
      - Can have content populated by SOM content producers
    - Codestar: Github or Bitbucket source
      - Needs manual intervention to set up (CodeStar connection)
      - Cannot automatically provision content for repo via content producers
        - Because cannot create/write to such a repo, connection is read-only
          - Check this?
    - Would be tricky to have something else
      - Leave it to OSS if anything

    
#### NOTES
- So we need content producers?
  - Can only really be for CodeCommit source repos
    - CONS: various, a hassle to maintain, limited in nature unless OSS kicks in
    - PROS: can properly provide an automated ("-o-matic") flow to provide placeholder WWW content
- 
- Should support AWS as domain registrar??
  - Not sure if there is a way to:
    - Put "konkeristhebest.com" in a manifest file
    - Run deploy
    - Boom: domain is registered if available and SOM proceeds as usual!
  - Question of billing?
    - Some other hoops?
- HOUM!: it is a hole if AWS is not a supported domain registrar

- !!!: Do we need a Cloudwatch alarm when certificate is (threshold < 45 days) from expiry??
  - What to do with this alarm is another question
- Metrics/Monitoring
  - A whole field that has been basically ignored
    - Consult Hammess/Lardee for advice?
  - Logging?
    - Off by default for cost reasons
    - On if needed?
      - WHat does "On" actually mean for this kind of web hosting? 
  - Analytics?
    - Based on logging?
    - Left as purely front-end? GA or less intrusive alternatives?
  - Lower level components:
    - WAF logging
    - CertificateManager expiry?
    - CodePipeline failures?
    - R53/DNS failures?
  - Higher level:
    - GET/200
    - Out of scope of SOM?
      - Yes

- Notifications/Messaging:
  - Create a possibility to configure some channels to push notifications:
    - "Easy": AWS messenger, (..MS teams? something lame like that)
    - "Better": Matrix, Telegram, Slack
    - "Unlikely": Whatsapp
    - Pipeline: message on "STARTED", "FINISHED", "FAILED", etc
 
