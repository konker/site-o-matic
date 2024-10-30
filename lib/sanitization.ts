export const SANITIZATION_CHECKS: ReadonlyArray<[RegExp, string]> = [
  [/AccessKeyId = .*\n/, 'AccessKeyId = ***\n'],
  [/AccessKeySecret = .*\n/, 'AccessKeySecret = ****\n'],
] as const;

export function sanitizeOutput(s: string): string {
  // return SANITIZATION_CHECKS.reduce((acc, [regexp, replacement]) => (acc.match(regexp) ? replacement : acc), s);
  return SANITIZATION_CHECKS.reduce((acc, [regexp, replacement]) => acc.replace(regexp, replacement), s);
}
