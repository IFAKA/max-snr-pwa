import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

// Domain code (data, state, storage, workout rules) must stay framework-free and must not
// depend on screens, components, or browser navigation.
const DOMAIN_FILES = [
  'src/lib/workout/**/*.ts',
  'src/lib/storage/**/*.ts',
  'src/lib/health/**/*.ts',
  'src/lib/routine/routine-data.ts',
  'src/lib/state.ts',
  'src/lib/constants.ts',
  'src/lib/types.ts',
];

export default defineConfig(
  {
    ignores: [
      'node_modules/**',
      '.vercel/**',
      '.svelte-kit/**',
      'build/**',
      'test-results/**',
      'playwright-report/**',
      'android/**',
    ],
  },
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  prettier,
  svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.serviceworker },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          caughtErrors: 'none',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
      },
    },
    rules: {
      // Icon paths are static, trusted markup from components/icons.ts.
      'svelte/no-at-html-tags': 'off',
      // Navigation uses plain paths; the app is served from the domain root.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    // Test doubles toggle classes with short-circuit expressions.
    files: ['packages/**/tests/**', 'tests/**'],
    rules: { '@typescript-eslint/no-unused-expressions': 'off' },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.svelte', 'scripts/**/*.{js,mjs}'],
    rules: {
      complexity: ['error', 50],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'no-param-reassign': 'error',
    },
  },
  {
    files: DOMAIN_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '*.svelte',
                '$app/*',
                '**/browser/*',
                '**/components/*',
                '**/workout-screens/*',
                '**/today/*',
                '**/history/*',
                '**/app-state.svelte.ts',
              ],
              message: 'Domain modules must not depend on presentation, browser, or navigation.',
            },
          ],
        },
      ],
    },
  },
);
