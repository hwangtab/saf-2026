import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const nextConfig = require('eslint-config-next/core-web-vitals');

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    rules: {
      'react/no-unescaped-entities': 'error',
      'react/display-name': 'error',
      '@next/next/no-html-link-for-pages': 'error',
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'import/first': 'error',
    },
  },
  {
    files: ['components/common/SafeImage.tsx'],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
  {
    // Test files can use <img> instead of next/image
    files: ['__tests__/**/*'],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
  {
    ignores: ['scripts/*', 'coverage/**'],
  },
];

export default config;
