import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'] as const;

// 실제 게시(available) 작품 UUID — 카트 시드가 실제 항목 행으로 렌더되도록.
// (작품이 비공개되면 행은 '구매 불가'로 폴백되지만 a11y 스캔 자체는 유효.)
const SEED_ARTWORK_ID = 'c2c08ed0-7b42-4083-a271-a3ce55e51c28';

/** localStorage 카트를 페이지 로드 전에 시드 — 비어있지 않은 카트/체크아웃 상태 재현. */
function seedCart(page: Page, items: { artworkId: string; quantity: number }[]) {
  return page.addInitScript((seed) => {
    window.localStorage.setItem('saf:cart', JSON.stringify(seed));
  }, items);
}

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze();
  expect(results.violations).toEqual([]);
}

for (const locale of ['ko', 'en'] as const) {
  // 헤더 장바구니 버튼 aria-label (cart.headerLabel)
  const cartButtonName = locale === 'en' ? 'Cart' : '장바구니';

  test(`/${locale}/cart 장바구니(빈 상태) — WCAG AA a11y 위반 없음`, async ({ page }) => {
    await page.goto(`/${locale}/cart`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    await expectNoA11yViolations(page);
  });

  test(`/${locale}/cart 장바구니(비어있지 않음) — WCAG AA a11y 위반 없음`, async ({ page }) => {
    await seedCart(page, [{ artworkId: SEED_ARTWORK_ID, quantity: 1 }]);
    await page.goto(`/${locale}/cart`);
    await page.waitForLoadState('networkidle');
    // 카트 항목/요약 렌더(작품 상세 fetch 포함) 대기
    await page.waitForTimeout(1200);

    await expectNoA11yViolations(page);
  });

  test(`/${locale} 장바구니 드로어(focus trap dialog 열림) — WCAG AA a11y 위반 없음`, async ({
    page,
  }) => {
    // 카트에 항목을 넣어 드로어가 빈 상태가 아닌 항목 UI로 열리게 함.
    await seedCart(page, [{ artworkId: SEED_ARTWORK_ID, quantity: 1 }]);
    // 헤더(장바구니 버튼)가 항상 있는 작품 목록 페이지에서 드로어를 연다 —
    // 특정 작품 상세/UUID에 의존하지 않고 focus-trapped dialog를 스캔.
    await page.goto(`/${locale}/artworks`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: cartButtonName }).first().click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    // 드로어 내부 항목/요약 비동기 로드 대기
    await page.waitForTimeout(1000);

    await expectNoA11yViolations(page);
  });

  test(`/${locale}/checkout 결제(카트 시드) — WCAG AA a11y 위반 없음`, async ({ page }) => {
    // 빈 카트면 체크아웃이 빈 상태로 렌더되므로 항목을 시드해 실제 결제 UI를 스캔.
    await seedCart(page, [{ artworkId: SEED_ARTWORK_ID, quantity: 1 }]);
    await page.goto(`/${locale}/checkout`);
    await page.waitForLoadState('networkidle');
    // 카트 작품 로드 + Toss 위젯 셸 렌더 대기
    await page.waitForTimeout(1500);

    await expectNoA11yViolations(page);
  });
}
