import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// 공개 펀딩 페이지 a11y 회귀 잠금
// bg-primary + small text WCAG AA 위반 방지 (회귀 사고: 2026-05-29 참고)
// /funding/[slug] — PageHero + FundingProgressBar + FundingPledgeFlow
const SLUG = 'oh-yoon-terracotta';

for (const locale of ['ko', 'en'] as const) {
  test(`/${locale}/funding/${SLUG} — WCAG AA a11y 위반 없음`, async ({ page }) => {
    await page.goto(`/${locale}/funding/${SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    // animate-stamp 카드 애니메이션(0.5s) + 진행률 바 초기 렌더 완료 대기
    await page.waitForTimeout(800);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
