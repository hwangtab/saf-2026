import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['ko', 'en'] as const) {
  test(`/${locale}/exhibition/oh-yoon-terracotta — WCAG AA a11y 위반 없음`, async ({ page }) => {
    await page.goto(`/${locale}/exhibition/oh-yoon-terracotta`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page })
      // 장식용 aria-hidden 요소(대형 워터마크 텍스트 등)는 AT에서 숨긴 순수 장식이라
      // color-contrast 의무가 없다. 그러나 axe는 aria-hidden도 저대비로 오탐지하므로 제외한다.
      .exclude('[aria-hidden="true"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
