import fs from 'fs';

import exampleManifest from '../../docs/site-o-matic.manifest.example.json';
import * as unit from './index';
import manifestSchema from './schemas/som-manifest.json';

describe('manifest', () => {
  beforeAll(() => {
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(Buffer.from(JSON.stringify(exampleManifest)));
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('validateManifest', () => {
    it('should validate a manifest', async () => {
      const result = await unit.validateManifest(manifestSchema.examples[0]);
      expect(result).toBe(true);
    });
  });

  describe('loadManifest', () => {
    it('should return a valid manifest', async () => {
      const result = await unit.loadManifest('/path/to/manifest.json');
      expect(result).toBeDefined();
    });
  });
});
