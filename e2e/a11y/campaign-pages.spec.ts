import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  '/petition/oh-yoon',
  '/special/oh-yoon',
  '/artworks/artist/신학철',
  '/artworks/artist/민정기',
  '/artworks/artist/이철수',
  '/artworks/artist/박불똥',
  '/artworks/artist/박재동',
  '/artworks/artist/류연복',
  '/artworks/artist/김준권',
  '/artworks/artist/최병수',
  '/artworks/artist/조문호',
  '/artworks/artist/주재환',
  '/artworks/artist/손은영',
  '/artworks/artist/김레이시',
  '/artworks/artist/정미정',
  '/artworks/artist/박성완',
  '/artworks/artist/이익태',
  '/artworks/artist/이호철',
  '/artworks/artist/강석태',
  '/artworks/artist/민정See',
  '/artworks/artist/홍진희',
  '/artworks/artist/장천 김성태',
  '/artworks/artist/윤겸',
  '/artworks/artist/이열',
  '/artworks/artist/조신욱',
  '/artworks/artist/최재란',
  '/artworks/artist/남진현',
  '/artworks/artist/이현정',
  '/artworks/artist/심모비',
  '/artworks/artist/이수철',
  '/artworks/artist/최윤정',
];

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
