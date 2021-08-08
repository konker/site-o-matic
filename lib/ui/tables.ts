import Table from 'cli-table';

// eslint-disable-next-line func-style
const defaultDecorator = (headers: Array<string>) => (rec: any): Array<string> => {
  return headers.reduce((acc, f) => {
    if (Array.isArray(rec[f])) {
      return acc.concat(rec[f].join(','));
    } else if (typeof rec[f] === 'object') {
      return acc.concat(JSON.stringify(rec[f]));
    } else if (!rec[f]) {
      return acc.concat('<null>');
    }
    return acc.concat(rec[f]);
  }, [] as Array<string>);
};

/**
 * Separate the given arguments with a tab character
 *
 * @param recs - records
 * @param headers - headers
 * @returns {string} table
 */
export function tabulate(recs: Array<any>, headers: Array<string>): string {
  const table = new Table({
    head: headers,
  });
  const rows = recs.map(defaultDecorator(headers));

  // eslint-disable-next-line prefer-spread
  table.push.apply(table, rows);

  return table.toString();
}