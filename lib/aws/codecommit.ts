import { CodeCommitClient, GetRepositoryCommand } from '@aws-sdk/client-codecommit';
import type { RepositoryMetadata } from '@aws-sdk/client-codecommit/dist-types/models/models_0';

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
