import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['ko', 'en'] as const) {
  test(`/${locale}/collections 컬렉션 랜딩 — WCAG AA a11y 위반 없음`, async ({ page }) => {
    await page.goto(`/${locale}/collections`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test(`/${locale}/collections/living-room 개별 컬렉션 — WCAG AA a11y 위반 없음`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/collections/living-room`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
