import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

// bg-primary + text-white WCAG AA 회귀 잠금
// our-proof: "예술인 대출" highlight 박스
// changelog: 필터 pill
// (회귀 사고: 2026-05-29 oh-yoon CTA bg-primary 4.11:1 위반)
const ROUTES = ['/our-proof', '/changelog'];

for (const locale of ['ko', 'en'] as const) {
  for (const route of ROUTES) {
    test(`/${locale}${route} — WCAG AA a11y 위반 없음`, async ({ page }) => {
      await page.goto(`/${locale}${route}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}
