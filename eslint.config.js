import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', '.vercel/**', 'js/vendor/**'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    rules: {
      'no-unused-vars': ['error', {args: 'after-used', caughtErrors: 'none'}],
    },
  },
  {
    files: ['app.js', 'js/**/*.js', 'sw.js'],
    rules: {
      complexity: ['error', 50],
      'max-lines': ['error', {max: 400, skipBlankLines: true, skipComments: true}],
      'max-lines-per-function': ['error', {max: 200, skipBlankLines: true, skipComments: true}],
      'no-param-reassign': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../render-*.js', '../render-workout/**', '../navigation.js'],
              importNames: ['*'],
              message: 'Workout domain modules must not depend on presentation or navigation.',
            },
          ],
        },
      ],
    },
  },
  prettier,
];
