import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

// 공개 펀딩 페이지 a11y 회귀 잠금
// bg-primary + small text WCAG AA 위반 방지 (회귀 사고: 2026-05-29 참고)
// /funding/[slug] — PageHero + FundingProgressBar + FundingPledgeFlow
const SLUG = 'oh-yoon-terracotta';

for (const locale of ['ko', 'en'] as const) {
  test(`/${locale}/funding/${SLUG} — WCAG AA a11y 위반 없음`, async ({ page }) => {
    await page.goto(`/${locale}/funding/${SLUG}`, { waitUntil: 'domcontentloaded' });
    // networkidle은 쓰지 않는다 — CI placeholder 환경에서 커버/리워드 이미지가
    // 존재하지 않는 호스트(placeholder.supabase.co)로 무한 재시도되어 networkidle에
    // 도달하지 못하고 30s 타임아웃이 난다(/en 간헐 실패). load + 고정 대기로 충분.
    await page.waitForLoadState('load');
    // 진행률 바 초기 렌더 완료 대기 (reduced-motion fixture가 reveal 애니는 즉시 완료)
    await page.waitForTimeout(800);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
