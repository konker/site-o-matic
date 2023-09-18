import fs from 'fs';

import * as unit from './index';

describe('manifest', () => {
  beforeAll(() => {
    jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from(JSON.stringify({ rootDomainName: 'example.com' })));
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  //
  // describe('validateManifest', () => {
  //   for (const example of manifestSchema.examples) {
  //     it(`should validate a manifest ${example.rootDomainName}`, async () => {
  //       const result = await unit.validateManifest(example);
  //       expect(result).toBe(true);
  //     });
  //   }
  // });

  describe('loadManifest', () => {
    it('should return a valid manifest', async () => {
      const result = await unit.loadManifest('/path/to/manifest.json');
      expect(result).toBeDefined();
    });
  });
});
