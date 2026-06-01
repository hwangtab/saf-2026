import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/petition/oh-yoon', '/special/oh-yoon', '/artworks/artist/신학철'];

for (const locale of ['ko', 'en'] as const) {
  for (const route of ROUTES) {
    test(`/${locale}${route} — WCAG AA a11y 위반 없음`, async ({ page }) => {
      await page.goto(`/${locale}${route}`);
      await page.waitForLoadState('networkidle');
      // animate-stamp 카드 애니메이션(0.5s)이 완료될 때까지 대기 — 진행 중 opacity로 axe가 저대비 오탐
      await page.waitForTimeout(800);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}
