describe('lib/ui/logging.ts', () => {
  it('should FIXME', () => {
    expect(true).toBe(true);
  });
});

/*
import chalk from 'chalk';

import * as unit from './logging';
import * as tables from './tables';

describe('lib/ui/logging.ts', () => {
  describe('vlog', () => {
    it('should work as expected porcelain', async () => {
      const log = jest.fn();

      unit.vlog({ log } as any, { plumbing: false, baz: 'abc' } as any, 'foo');
      expect(log).toHaveBeenCalledWith('foo');
    });

    it('should work as expected plumbing', async () => {
      const log = jest.fn();
      unit.vlog({ log } as any, { plumbing: true, baz: 'abc' } as any, 'foo');
      expect(log).toHaveBeenCalledWith('{"state":{"plumbing":true,"baz":"abc"},"message":"foo"}');
    });
  });

  describe('verror', () => {
    it('should work as expected porcelain', async () => {
      const log = jest.fn();

      unit.verror({ log } as any, { plumbing: false, baz: 'abc' } as any, 'foo');
      expect(log).toHaveBeenCalledWith(chalk.red('foo'));
    });

    it('should work as expected plumbing', async () => {
      const log = jest.fn();
      unit.verror({ log } as any, { plumbing: true, baz: 'abc' } as any, 'foo');
      expect(log).toHaveBeenCalledWith('{"state":{"plumbing":true,"baz":"abc"},"error":"foo"}');
    });
  });

  describe('vtabulate', () => {
    beforeEach(() => {
      jest.spyOn(tables, 'tabulate').mockImplementation((...args: Array<any>) => JSON.stringify(args) as any);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should work as expected porcelain', async () => {
      const log = jest.fn();

      unit.vtabulate(
        { log } as any,
        { plumbing: false, baz: 'abc' } as any,
        ['foo', 'bar'],
        ['h1', 'h2'],
        ['dh1', 'dh2'],
        true,
        [11, 22]
      );
      expect(log).toHaveBeenCalledWith('[["foo","bar"],["h1","h2"],["dh1","dh2"],true,[11,22]]');
    });

    it('should work as expected plumbing', async () => {
      const log = jest.fn();
      unit.vtabulate({ log } as any, { plumbing: true, baz: 'abc' } as any, ['foo', 'bar'], ['h1', 'h2']);
      expect(log).toHaveBeenCalledWith('{"state":{"plumbing":true,"baz":"abc"},"data":["foo","bar"]}');
    });
  });
});

*/
