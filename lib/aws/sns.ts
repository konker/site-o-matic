import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

/**
 * Publish the given data to an SNS topic
 */
export async function postToSnsTopic(topicArn: string, data: unknown): Promise<string | undefined> {
  const client = new SNSClient({});
  const cmd = new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(data, undefined, 2),
  });

  try {
    const result = await client.send(cmd);
    return result?.MessageId;
  } catch (err) {
    return undefined;
  }
}
