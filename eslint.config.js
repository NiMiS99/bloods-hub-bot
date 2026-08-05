// eslint.config.js
// ESLint flat config for Bloods Hub Bot (ESLint v9+).
// Focus: catch real bugs without being too opinionated about style.
const globals = require('globals');

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Catch real bugs
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-constant-condition': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-cond-assign': 'error',
      'no-debugger': 'error',
      'no-self-assign': 'error',
      'no-shadow-restricted-names': 'error',
      'no-irregular-whitespace': 'warn',

      // Best practices
      'no-var': 'warn',
      'prefer-const': 'warn',
      'no-async-promise-executor': 'error',
      'require-await': 'off', // Many async functions are async for API compatibility
      'no-await-in-loop': 'off',

      // Relax for discord.js patterns
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dashboard/**',
      'dashboard/out/**',
      'logs/**',
      'backups/**',
      '_tmp_*',
    ],
  },
];
