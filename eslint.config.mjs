import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const nextConfig = require('eslint-config-next/core-web-vitals');

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    // eslint-config-next는 jsx-a11y plugin을 files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}']
    // 스코프에서만 등록한다(.cjs 등 제외). 이 룰 블록에 동일 스코프를 지정하지 않으면
    // .vercel 빌드 산출물의 ___next_launcher.cjs 같은 스코프 밖 파일에 jsx-a11y 룰이 적용되며
    // "could not find plugin 'jsx-a11y'" 에러로 `eslint .` 전체가 중단된다.
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    rules: {
      // jsx-a11y recommended (plugin already registered by eslint-config-next)
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/autocomplete-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/iframe-has-title': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/media-has-caption': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
      'jsx-a11y/lang': 'error',
      'jsx-a11y/no-aria-hidden-on-focusable': 'error',
      'jsx-a11y/prefer-tag-over-role': 'warn',
    },
  },
  {
    // 위와 동일 이유 — react/@next/next plugin도 같은 files 스코프에서만 등록되므로
    // 룰 블록의 스코프를 맞춰 스코프 밖 파일(.cjs 등)에서의 plugin-미등록 에러를 막는다.
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    rules: {
      'react/no-unescaped-entities': 'error',
      'react/display-name': 'error',
      '@next/next/no-html-link-for-pages': 'error',
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'import/first': 'error',
    },
  },
  {
    files: ['components/common/SafeImage.tsx', 'components/common/SafeAvatarImage.tsx'],
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
    // scripts/는 ESLint 검사 대상에 포함시키되 Node.js CommonJS 글로벌을 인식하도록 별도 환경 지정.
    // (process.exit, require, module 등 — 미적용 시 no-undef 폭발)
    files: ['scripts/**/*.{js,mjs,ts}'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        global: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // 스크립트는 운영 로깅이 필수 — no-console 비활성화
      'no-console': 'off',
      // CommonJS 스크립트엔 import 순서 규칙 부적합
      'import/first': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // .vercel: `vercel build`/`vercel pull` 산출물(___next_launcher.cjs 등) — lint 대상 아님.
    // .claude/.understand-anything: 도구/워크트리 산출물.
    ignores: [
      'coverage/**',
      '.next/**',
      '.worktrees/**',
      '.vercel/**',
      '.claude/**',
      '.understand-anything/**',
      'tmp/**',
    ],
  },
];

export default config;
