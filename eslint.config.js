export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { window: 'readonly', document: 'readonly', console: 'readonly', localStorage: 'readonly', fetch: 'readonly', alert: 'readonly', confirm: 'readonly' }
    },
    rules: {
      'no-template-curly-in-string': 'error',
      'no-useless-escape': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-redeclare': 'error',
      'no-undef': 'off' // index.html has many global helpers; deferred
    }
  },
  {
    ignores: ['vendor/**', 'node_modules/**', '_libs/**', 'Superseeded/**', 'docs/archive/**', 'templates/**']
  }
];
