import { CodeCommitClient, CreateCommitCommand, GetRepositoryCommand } from '@aws-sdk/client-codecommit';
import type { RepositoryMetadata } from '@aws-sdk/client-codecommit/dist-types/models/models_0';

import { SITE_PIPELINE_CODECOMMIT_BRANCH_NAME } from '../consts';

export async function getCodeCommitRepoForSite(somId: string): Promise<RepositoryMetadata | undefined> {
  const client = new CodeCommitClient({});
  try {
    const cmd1 = new GetRepositoryCommand({
      repositoryName: somId,
    });

    const result = await client.send(cmd1);
    return result?.repositoryMetadata;
  } catch (ex: any) {
    return undefined;
  }
}

/**
 * Create a NOOP commit to the site CodeCommit repo,
 * on the pipeline branch. This can be used to trigger the pipeline.
 *
 * @param somId
 */
export async function createCodeCommitNoopCommit(somId: string): Promise<string | undefined> {
  const client = new CodeCommitClient({});
  try {
    const cmd1 = new CreateCommitCommand({
      repositoryName: somId,
      branchName: SITE_PIPELINE_CODECOMMIT_BRANCH_NAME,
      commitMessage: 'NOOP to trigger pipeline',
    });

    const result = await client.send(cmd1);
    return result.commitId;
  } catch (ex: any) {
    console.log(ex);
    return undefined;
  }
}
