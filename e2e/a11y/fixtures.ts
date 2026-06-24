import { test as base, expect } from '@playwright/test';

/**
 * a11y 테스트 공통 fixture.
 *
 * 모든 a11y spec은 `@playwright/test` 대신 이 파일에서 test/expect를 import 한다.
 *
 * `page.emulateMedia({ reducedMotion: 'reduce' })`를 모든 테스트에 자동 적용:
 * - globals.css의 `.reveal-on-scroll`는 `animation-timeline: view()` 스크롤 기반
 *   reveal 애니메이션을 쓴다(`@media (prefers-reduced-motion: no-preference)` 안).
 * - viewport 밖 요소는 애니메이션 진행도가 낮아 opacity≈0.08로 렌더되는데,
 *   axe는 화면 밖 요소도 분석하므로 이를 color-contrast 위반으로 오탐지한다.
 * - reduced-motion을 켜면 애니메이션이 비활성되어 opacity:1 기본값이 유지된다
 *   (실제 reduce 사용자가 보는 상태 = 콘텐츠 항상 표시).
 *
 * ⚠️ playwright.config의 `use.reducedMotion`은 1.60에서 context에 적용되지 않아
 *    효과가 없었다. page.emulateMedia 명시 호출만 확실히 동작한다.
 */
export const test = base.extend({
  // playwright fixture의 `use`는 React Hook이 아니다 — rules-of-hooks 오탐 비활성.
  /* eslint-disable react-hooks/rules-of-hooks */
  page: async ({ page }, use) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await use(page);
  },
  /* eslint-enable react-hooks/rules-of-hooks */
});

export { expect };
export type { Page } from '@playwright/test';
