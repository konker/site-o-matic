# site-o-matic

A tool for managing websites hosted on AWS

## Installation

### 1. Install dependencies
```bash
  $ yarn
```

### 2. compile
```bash
  $ yarn build
```

## Running
Make sure you are authenticated for your desired AWS account, and run:
```bash
  $ node bin
```

## Concepts
### Manifests
  - TODO

### Users
  - TODO

### Secrets
  - TODO

### SSH Keys
  - TODO

### Registrars
  - TODO

## Setup
  - Initialize CDK for target AWS account?
  - Get an API key for the desired registrar API, if using
    - Dynadot: https://www.dynadot.com/domain/api3.html
  - Create a manifest file for the new site
  - Create a www folder for web content
  - Initialize a git repo
  - Create 

## Deploying
  1. Add an IAM user to deploy the site under, if the desired user does not exist
  2. Upload your SSH public key to the IAM user, note the SSH key ID
  3. Add line to ~/.ssh/config for convenience:
     ```
     Host git-codecommit.*.amazonaws.com
       User <SSH key ID>
       IdentityFile <path to SSH private key>
     ```
  4. Add a secret for the registrar API key, if using: `DYNADOT_API_KEY`
  5. load <path to manifest>
  6. deploy <username> -> `HostedZoneAwaitingNameserverConfig`
  7. info
  8. set nameservers -> `HostedZoneOk`
  9. deploy <username> -> `SiteFunctional`
  10. git add remote deploy <code-commit-clone-url-ssh>
  11. ..._commit web content_...
  12. git push deploy main

