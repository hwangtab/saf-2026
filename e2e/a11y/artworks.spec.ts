import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['ko', 'en'] as const) {
  test(`/${locale}/artworks 작품 목록 — WCAG AA a11y 위반 없음`, async ({ page }) => {
    await page.goto(`/${locale}/artworks`);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
