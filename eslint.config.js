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
    // index.html is intentionally ignored: flat-config ESLint cannot lint HTML
    // without a processor plugin, and the app's inline JS is full of
    // HTML-in-template-literal strings (the standalone report generator) that
    // a JS processor would flag as false positives. Lint covers scripts/,
    // tests/, and config files only.
    ignores: ['index.html', 'vendor/**', 'node_modules/**', '_libs/**', 'Superseeded/**', 'docs/archive/**', 'templates/**']
  }
];
