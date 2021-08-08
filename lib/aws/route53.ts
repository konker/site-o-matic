import * as AWS from 'aws-sdk';

export async function removeVerificationCnameRecord(region: string, hostedZoneId: string): Promise<void> {
  AWS.config.update({ region });
  const route53 = new AWS.Route53();

  if (!hostedZoneId) return;

  try {
    const result1 = await route53
      .listResourceRecordSets({
        HostedZoneId: hostedZoneId,
      })
      .promise();
    const verificationRecord = result1.ResourceRecordSets.find((i) => {
      if (i.ResourceRecords && i.ResourceRecords.length > 0) {
        return i.ResourceRecords[0].Value?.endsWith('.acm-validations.aws.');
      }
      return false;
    });

    if (verificationRecord) {
      const result2 = await route53
        .changeResourceRecordSets({
          HostedZoneId: hostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: 'DELETE',
                ResourceRecordSet: verificationRecord,
              },
            ],
          },
        })
        .promise();
    }
  } catch (ex) {
    console.log('FAILED: ', ex);
  }
}
