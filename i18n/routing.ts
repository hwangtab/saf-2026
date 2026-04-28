import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'as-needed',
  // URL prefix를 locale의 단일 출처로. 사용자가 KO로 전환해도 다음 페이지에서
  // 쿠키/Accept-Language 기반 자동 감지가 다시 /en/...로 끌어가던 회귀 차단.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
