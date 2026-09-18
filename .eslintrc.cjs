/* Konfigurasi ESLint untuk proyek React + TypeScript. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', 'node_modules', '*.tsbuildinfo'],
  rules: {
    // Hook dan konstanta navigasi sengaja diekspor berdampingan dengan komponennya;
    // dampaknya hanya granularitas hot reload saat pengembangan.
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true, allowExportNames: ['useLedger', 'useToast', 'NAV_ITEMS'] },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always'],
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx'],
      env: { node: true },
      rules: { 'no-console': 'off' },
    },
    {
      files: ['*.cjs', '*.config.js'],
      env: { node: true },
      parserOptions: { sourceType: 'script' },
      rules: { '@typescript-eslint/no-var-requires': 'off' },
    },
  ],
}
