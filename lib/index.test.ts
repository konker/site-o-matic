import * as unit from './index';

describe('lib', () => {
  describe('calculateDomainHash', () => {
    it('should work as expected', () => {
      expect(unit.calculateDomainHash('example.com')).toBe('5ababd');
    });
  });

  describe('normalizeDomainName', () => {
    it('should work as expected', () => {
      expect(unit.normalizeDomainName('example.com', 10)).toBe('example-dot-com');
      expect(unit.normalizeDomainName('dev.example.com', 10)).toBe('dev-dot-example-dot-com');
      expect(unit.normalizeDomainName('verylongdomainnamewhichwillbreachthethreshold.example.com', 10)).toBe(
        'verylongdomainnamewhichwillbreachtheth'
      );
    });
  });

  describe('formulateSomId', () => {
    it('should work as expected', () => {
      expect(unit.formulateSomId({ SOM_PREFIX: 'som' } as any, 'example.com')).toBe('som--example-dot-com--5ababd');
      expect(
        unit.formulateSomId({ SOM_PREFIX: 'som' } as any, 'verylongdomainnamewhichwillbreachthethreshold.example.com')
      ).toBe('som--verylongdomainnamewhichwillbreachth--512f7a');
    });
  });
});
