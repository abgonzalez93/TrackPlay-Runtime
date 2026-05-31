import eslintPluginPrettier from 'eslint-plugin-prettier'
import importPlugin from 'eslint-plugin-import'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import js from '@eslint/js'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    plugins: {
      prettier: eslintPluginPrettier,
      import: importPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        sourceType: 'module',
      },
    },
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      'import/no-cycle': ['error', { maxDepth: Infinity }],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
  prettier,
]
