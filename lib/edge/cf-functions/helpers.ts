// Handlebars helpers

export const CF_FUNCTIONS_HANDLEBARS_HELPERS = [
  [
    'base64Encode',
    function (s: string) {
      return Buffer.from(s).toString('base64');
    },
  ],
] as const;
