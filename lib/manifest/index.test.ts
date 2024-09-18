import fs from 'node:fs';

import * as unit from './index';
import { sortObjectKeys } from './index';

describe('manifest', () => {
  beforeAll(() => {
    jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from(JSON.stringify({ rootDomainName: 'example.com' })));
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('loadManifest', () => {
    it('should return a valid manifest', async () => {
      const result = await unit.loadManifest('/path/to/manifest.json');
      expect(result).toBeDefined();
    });
  });

  describe('sortObjectKeys', () => {
    it('should work as expected', () => {
      expect(sortObjectKeys({})).toStrictEqual({});
    });
  });
});
