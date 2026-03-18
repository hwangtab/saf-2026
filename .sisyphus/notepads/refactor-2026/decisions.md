# SAF 2026 리팩토링 - 결정 사항

## 단계별 실행 계획

### Phase 1: resolveLocale 중복 제거 (13개 파일)

- `lib/server-locale.ts`에 `resolveLocale` 함수 export 추가
- 13개 페이지 파일에서 로컬 정의 제거 후 import로 교체
- 대상 파일:
  1. app/[locale]/transparency/page.tsx
  2. app/[locale]/privacy/page.tsx
  3. app/[locale]/archive/2023/page.tsx
  4. app/[locale]/archive/2026/page.tsx
  5. app/[locale]/archive/page.tsx
  6. app/[locale]/terms/exhibitor/page.tsx
  7. app/[locale]/terms/page.tsx
  8. app/[locale]/terms/artist/page.tsx
  9. app/[locale]/special/oh-yoon/page.tsx
  10. app/[locale]/news/page.tsx
  11. app/[locale]/our-reality/page.tsx
  12. app/[locale]/artworks/artist/[artist]/page.tsx
  13. app/[locale]/our-proof/page.tsx

### Phase 2: createPageMetadata 활용 통일 (23개 페이지)

- `lib/seo.ts`의 `createPageMetadata()` 함수 확인 후 필요시 보완
- 각 페이지의 수동 OG/Twitter 블록을 함수 호출로 교체
- Phase 1 완료 후 진행

### Phase 3: 대형 파일 분리

- admin-artwork-list.tsx (1,268줄) → \_components/ 분리
- user-list.tsx (1,249줄) → \_components/ 분리
- logs-list.tsx (1,168줄) → \_components/ 분리
- Phase 2 완료 후 진행

## 불변 원칙

- 기능 변경 없음 — 순수 구조 리팩토링
- 각 Phase 후 `npm run type-check && npm run lint` 통과 필수
- 테스트 파일 있으면 통과 확인
