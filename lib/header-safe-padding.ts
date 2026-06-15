/**
 * 고정 헤더(Header)를 비우는 상단 패딩 — 단일 출처.
 *
 * Header는 `fixed top-0 h-16`(64px)이고 `app/[locale]/layout.tsx`의 `<main>`은
 * 상단 패딩이 없다. 따라서 **PageHero가 없는 standalone 페이지**(checkout·orders·
 * mypage·event success/fail/manage 같은 터미널/유틸 페이지)는 루트 요소에 이 상수를
 * 직접 적용해 콘텐츠가 헤더 밑으로 가리지 않게 해야 한다.
 *
 * 회귀 이력(2026-06-15): event success/fail 페이지가 `min-h-[60vh] items-center
 * justify-center`만 쓰고 상단 패딩을 빠뜨려, 콘텐츠가 길어지는 모바일에서 첫 줄이
 * 고정 헤더 아래로 들어갔다. checkout 계열은 `pt-24`를 쓰는데 event 계열만 누락.
 *
 * 적용 규칙:
 *  - PageHero를 쓰는 페이지(공개 hero 라우트, /cart 등)는 hero가 헤더를 덮으므로 불필요.
 *  - 그 외 standalone 페이지는 루트에 `HEADER_SAFE_TOP_PADDING`을 적용.
 *  - 푸터 sawtooth가 아래에 있으면 하단은 `SAWTOOTH_TOP_SAFE_PADDING`을 함께 적용.
 *
 * 값: pt-24(96px) — 헤더 64px + 32px 여백. (mypage처럼 더 큰 여백이 필요하면 뒤에
 * `md:pt-28` 등을 덧붙여 사용.)
 *
 * 가드: __tests__/lib/page-header-clearance.test.ts 가 모든 비-hero standalone
 * 페이지에 이 패딩(또는 PageHero)이 있는지 정적 검사한다.
 */
export const HEADER_SAFE_TOP_PADDING = 'pt-24';
