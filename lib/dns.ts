import * as dns from 'dns';

export async function resolveDnsNameserverRecords(domainName: string): Promise<Array<string>> {
  return new Promise((resolve, _reject) =>
    dns.resolveNs(domainName, (err: unknown, res: Array<string>) => {
      if (err) resolve([]);
      resolve(res);
    })
  );
}

export async function resolveDnsSomTxtRecord(rootDomain?: string): Promise<string | undefined> {
  if (!rootDomain) return undefined;

  return new Promise((resolve, _reject) =>
    dns.resolveTxt(`_som.${rootDomain}`, (err: unknown, res: Array<Array<string>>) => {
      if (err) resolve(undefined);
      if (res?.[0]) {
        resolve(res[0][0]);
      }
      resolve(undefined);
    })
  );
}
