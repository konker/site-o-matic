import chalk from 'chalk';
import Table from 'cli-table';

// eslint-disable-next-line func-style
const defaultDecorator =
  (headers: Array<string>, truncate: boolean) =>
  (rec: any): Array<string> => {
    return headers.reduce((acc, f) => {
      if (Array.isArray(rec[f])) {
        return acc.concat(rec[f].join(','));
      } else if (typeof rec[f] === 'object') {
        return acc.concat(JSON.stringify(rec[f]));
      } else if (!rec[f]) {
        return acc.concat('<null>');
      }
      return acc.concat(rec[f].length > 50 && truncate ? rec[f].split('/').join('/\n') : rec[f]);
    }, [] as Array<string>);
  };

/**
 * Separate the given arguments with a tab character
 *
 * @param recs - records
 * @param headers - headers matching data
 * @param displayHeaders - headers to display
 * @returns {string} table
 */
export function tabulate(
  recs: Array<any>,
  headers: Array<string>,
  displayHeaders: Array<string> | undefined = undefined,
  truncate = false,
  colWidths: Array<number> = [30, 95, 15, 20, 20, 20, 20]
): string {
  const table = new Table({
    head: (displayHeaders ?? headers).map((h) => chalk.cyan(chalk.bold(h))),
    colWidths: colWidths.slice(0, headers.length),
  });
  const rows = recs.map(defaultDecorator(headers, truncate));

  // eslint-disable-next-line prefer-spread
  table.push.apply(table, rows);

  return table.toString();
}
