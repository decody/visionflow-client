import StyleDictionary from 'style-dictionary';

StyleDictionary.registerFormat({
  name: 'typescript/theme',
  format: ({ dictionary }) => {
    const tokens = {};

    dictionary.allTokens.forEach((token) => {
      let obj = tokens;

      token.path.forEach((key, index) => {
        if (index === token.path.length - 1) {
          obj[key] = token.value;
          return;
        }

        obj[key] = obj[key] || {};
        obj = obj[key];
      });
    });

    return [
      '// AUTO GENERATED - DO NOT EDIT',
      `export const theme = ${JSON.stringify(tokens, null, 2)} as const;`,
      'export type Theme = typeof theme;',
      '',
    ].join('\n');
  },
});

export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'styles/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: {
            selector: ':root',
          },
        },
      ],
    },
    ts: {
      transformGroup: 'js',
      buildPath: '../shared/src/constants/',
      files: [
        {
          destination: 'theme.ts',
          format: 'typescript/theme',
        },
      ],
    },
  },
};
