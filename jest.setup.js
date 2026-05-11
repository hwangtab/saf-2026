import { TextEncoder, TextDecoder } from 'util';
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for Next.js 16: jsdom 환경에는 TextEncoder/TextDecoder가 없어
// `next/cache`를 import하는 순간 ReferenceError가 발생한다.
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key) => key,
  useLocale: () => 'ko',
}));

// @vercel/analytics는 ESM-only (`.mjs` + `export`). jest 기본 transform이 node_modules를
// 무시해 `SyntaxError: Unexpected token 'export'`로 분석 import 체인 전체 깨짐.
// 글로벌 mock으로 우회 — 어차피 테스트에선 송신 검증 X.
jest.mock('@vercel/analytics', () => ({
  track: jest.fn(),
}));

// Mock @/i18n/navigation (locale-aware navigation)
jest.mock('@/i18n/navigation', () => {
  const React = require('react');
  return {
    Link: React.forwardRef(function MockLink({ href, children, ...props }, ref) {
      return React.createElement('a', { href, ref, ...props }, children);
    }),
    usePathname: () => '/',
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }),
    redirect: jest.fn(),
    getPathname: jest.fn(),
  };
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
