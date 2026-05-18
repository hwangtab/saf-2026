import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/petition', '/special/oh-yoon'];

for (const locale of ['ko', 'en'] as const) {
  for (const route of ROUTES) {
    test(`/${locale}${route} — WCAG AA a11y 위반 없음`, async ({ page }) => {
      await page.goto(`/${locale}${route}`);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}
