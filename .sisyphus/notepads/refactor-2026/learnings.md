# SAF 2026 리팩토링 - 학습 내용

## 프로젝트 기본 정보

- Next.js 14+ App Router, TypeScript, Tailwind CSS, Supabase
- 다국어: next-intl (ko/en), `[locale]` 동적 라우트
- 빌드: `npm run build`, 타입체크: `npm run type-check`, 린트: `npm run lint`

## 핵심 패턴

- `@/` alias import 사용 (953개), 상대경로는 동일 디렉토리 내만 허용
- 브랜드 색상: `lib/colors.ts` BRAND_COLORS → tailwind.config.ts 동기화
- Supabase 클라이언트: `lib/auth/server.ts` 중앙화
- 서버 액션: `app/actions/` 도메인별 분리

## 발견된 중복 패턴

- `resolveLocale` 함수: 13개 파일에 동일 1줄 함수 복붙
  - 이미 `lib/server-locale.ts`에 `getServerLocale()` 존재 (22개 파일 사용 중)
  - 해결: `lib/server-locale.ts`에 `resolveLocale` export 추가
- `generateMetadata` OG/Twitter 블록: 23개 페이지에 반복
  - 이미 `lib/seo.ts`에 `createPageMetadata()` 존재 (1개만 사용)
  - 해결: 기존 함수 활용 확대

## 주의사항

- `lib/seo.ts`의 `createPageMetadata()`는 `title` suffix를 OG/Twitter에만 추가
  - `<title>` 태그는 layout template `%s | 씨앗페 2026`이 처리
  - OG/Twitter는 수동으로 `${title} | ${siteTitle}` 추가
- `getServerLocale()`은 cookies() 기반, `resolveLocale()`은 string 변환 유틸
  - 두 함수는 역할이 다름 — 혼용 주의
- `console.error`는 모두 에러 핸들링 목적 → 제거 금지
