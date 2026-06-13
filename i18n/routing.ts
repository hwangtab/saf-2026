import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'as-needed',
  // URL prefix를 locale의 단일 출처로. 사용자가 KO로 전환해도 다음 페이지에서
  // 쿠키/Accept-Language 기반 자동 감지가 다시 /en/...로 끌어가던 회귀 차단.
  localeDetection: false,
  // HTTP Link 헤더(hreflang) 발행 비활성 (2026-06-12 감사) — next-intl 기본 Link 헤더는
  // 요청 호스트를 그대로 반사(apex 요청 시 apex URL)하고 noindex인 /en 작품 상세까지
  // alternate로 선언해, generateMetadata가 발행하는 HTML hreflang(www 고정, koOnly 정책
  // 반영)과 모순된 신호를 보냈다. hreflang은 HTML 메타데이터로 단일화한다.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
