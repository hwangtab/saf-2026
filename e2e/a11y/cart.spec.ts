import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'] as const;

// 정적 fallback에도 존재하는 실제 게시 작품 UUID — CI의 제한된 env에서도 실제 항목 행으로 렌더.
const SEED_ARTWORK_ID = 'dd0edcca-0e02-4cc1-a55c-bbef80223190';
const SEED_ARTWORK_TITLE = '아지안타& 정각산';

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
    await page.goto(`/${locale}/cart`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(locale === 'en' ? 'Your cart is empty' : '장바구니가 비어 있습니다')
    ).toBeVisible();

    await expectNoA11yViolations(page);
  });

  test(`/${locale}/cart 장바구니(비어있지 않음) — WCAG AA a11y 위반 없음`, async ({ page }) => {
    await seedCart(page, [{ artworkId: SEED_ARTWORK_ID, quantity: 1 }]);
    await page.goto(`/${locale}/cart`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(SEED_ARTWORK_TITLE)).toBeVisible({ timeout: 10_000 });

    await expectNoA11yViolations(page);
  });

  test(`/${locale} 장바구니 드로어(focus trap dialog 열림) — WCAG AA a11y 위반 없음`, async ({
    page,
  }) => {
    // 카트에 항목을 넣어 드로어가 빈 상태가 아닌 항목 UI로 열리게 함.
    await seedCart(page, [{ artworkId: SEED_ARTWORK_ID, quantity: 1 }]);
    // 헤더(장바구니 버튼)가 항상 있는 작품 목록 페이지에서 드로어를 연다 —
    // 특정 작품 상세/UUID에 의존하지 않고 focus-trapped dialog를 스캔.
    await page.goto(`/${locale}/artworks`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: cartButtonName }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(SEED_ARTWORK_TITLE)).toBeVisible({ timeout: 10_000 });

    await expectNoA11yViolations(page);
  });

  test(`/${locale}/checkout 결제(카트 시드) — WCAG AA a11y 위반 없음`, async ({ page }) => {
    // 빈 카트면 체크아웃이 빈 상태로 렌더되므로 항목을 시드해 실제 결제 UI를 스캔.
    await seedCart(page, [{ artworkId: SEED_ARTWORK_ID, quantity: 1 }]);
    await page.goto(`/${locale}/checkout`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: locale === 'en' ? 'Checkout' : '결제', exact: true })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(SEED_ARTWORK_TITLE)).toBeVisible({ timeout: 10_000 });

    await expectNoA11yViolations(page);
  });
}
