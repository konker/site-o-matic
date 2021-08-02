import * as cdk from '@aws-cdk/core';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as ssm from '@aws-cdk/aws-ssm';
import { SiteProps } from '../../../../../lib';
import { SitePipelineProps, SOM_TAG_NAME, toSsmParamName } from '../common';
import { SitePipelineStack } from './SitePipelineStack';

export class CodecommitSitePipelineStack extends SitePipelineStack {
  public codeCommitRepo: codecommit.Repository;

  constructor(scope: cdk.Construct, siteProps: SiteProps, props: SitePipelineProps) {
    super(scope, siteProps, props);
  }

  async build() {
    await super.build();

    // ----------------------------------------------------------------------
    // Codecommit git repo
    this.codeCommitRepo = new codecommit.Repository(this, 'CodeCommitRepo', {
      repositoryName: this.somId,
    });
    this.codeCommitRepo.grantPullPush(this.domainUser);
    cdk.Tags.of(this.codeCommitRepo).add(SOM_TAG_NAME, this.somId);

    // ----------------------------------------------------------------------
    // SSM Params
    new ssm.StringParameter(this, 'SSmCodeCommitCloneUrlSsh', {
      parameterName: toSsmParamName(this.somId, 'code-commit-clone-url-ssh'),
      stringValue: this.codeCommitRepo.repositoryCloneUrlSsh,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
  }
}
