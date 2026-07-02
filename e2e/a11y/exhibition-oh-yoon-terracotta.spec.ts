import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['ko', 'en'] as const) {
  test(`/${locale}/exhibition/oh-yoon-terracotta — WCAG AA a11y 위반 없음`, async ({ page }) => {
    await page.goto(`/${locale}/exhibition/oh-yoon-terracotta`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
