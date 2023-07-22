import * as unit from './index';

describe('lib', () => {
  describe('calculateDomainHash', () => {
    it('should work as expected', () => {
      expect(unit.calculateDomainHash('example.com')).toBe('2a7405');
    });
  });

  describe('normalizeDomainName', () => {
    it('should work as expected', () => {
      expect(unit.normalizeDomainName('example.com', 10)).toBe('example-dot-com');
      expect(unit.normalizeDomainName('verylongdomainnamewhichwillbreachthethreshold.example.com', 10)).toBe(
        'verylongdomainnamewhichwillbreachtheth'
      );
    });
  });

  describe('formulateSomId', () => {
    it('should work as expected', () => {
      expect(unit.formulateSomId('example.com')).toBe('som--example-dot-com--2a7405');
      expect(unit.formulateSomId('verylongdomainnamewhichwillbreachthethreshold.example.com')).toBe(
        'som--verylongdomainnamewhichwillbreachth--ed17fc'
      );
    });
  });
});
