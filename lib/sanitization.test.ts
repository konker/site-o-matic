import * as unit from './sanitization';

describe('sanitization', () => {
  describe('sanitizeOutput', () => {
    it('should work as expected', () => {
      expect(unit.sanitizeOutput('')).toEqual('');
      expect(unit.sanitizeOutput('foo')).toEqual('foo');
      expect(unit.sanitizeOutput('foo\n')).toEqual('foo\n');
      expect(
        unit.sanitizeOutput(
          'som--konker-dot-click--bb02cd-bootstrap.OutputDomainPublisherAccessKeyId = AKIABCDEFGHIJKLMNOPQ\n'
        )
      ).toEqual('som--konker-dot-click--bb02cd-bootstrap.OutputDomainPublisherAccessKeyId = ***\n');
      expect(
        unit.sanitizeOutput(
          'som--konker-dot-click--bb02cd-bootstrap.OutputDomainPublisherAccessKeySecret = BVLXxxXxxxx9XxX9XxXx9X9XXXX9xX9XxxXXxxXx\n'
        )
      ).toEqual('som--konker-dot-click--bb02cd-bootstrap.OutputDomainPublisherAccessKeySecret = ****\n');
      expect(
        unit.sanitizeOutput(
          'foo\n' +
            'som--konker-dot-click--bb02cd-bootstrap.OutputDomainPublisherAccessKeyId = AKIABCDEFGHIJKLMNOPQ\n' +
            'som--konker-dot-click--bb02cd-bootstrap.OutputDomainPublisherAccessKeySecret = BVLXxxXxxxx9XxX9XxXx9X9XXXX9xX9XxxXXxxXx\n'
        )
      ).toEqual(
        'foo\n' +
          'som--konker-dot-click--bb02cd-bootstrap.OutputDomainPublisherAccessKeyId = ***\n' +
          'som--konker-dot-click--bb02cd-bootstrap.OutputDomainPublisherAccessKeySecret = ****\n'
      );
    });
  });
});
