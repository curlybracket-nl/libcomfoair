// @ts-check
import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// This is just an example default config for ESLint.
// You should change it to your needs following the documentation.
export default tseslint.config(
  {
    ignores: ['**/out/**', '**/tmp/**', '**/coverage/**', '**/src/protocol/**'],
  },
  eslint.configs.recommended,
  // @ts-ignore
  eslintConfigPrettier,
  {
    extends: [...tseslint.configs.recommended],

    files: ['src/**/*.ts', 'src/**/*.mts'],

    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },

    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off'
    },

    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      sourceType: 'module',

      globals: {
        ...globals.node,
      },

      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  {
    files: ['src/__tests__/**'],

    plugins: {
      vitest,
    },

    rules: {
      ...vitest.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
    },

    settings: {
      vitest: {
        typecheck: true,
      },
    },

    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
  },
);
