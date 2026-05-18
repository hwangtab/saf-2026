import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('/ko 홈페이지 — WCAG AA a11y 위반 없음', async ({ page }) => {
  await page.goto('/ko');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
