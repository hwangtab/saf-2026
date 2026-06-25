import { test, expect, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'] as const;

/**
 * 단건 바로구매 결제(`/checkout/[artworkId]`) — 실제 결제 폼(BuyerInfoForm: 성함·연락처·
 * 주소·약관 동의 + 결제수단 선택)이 렌더되는 경로다. 카트 결제(`/checkout`)는 cart.spec이
 * 커버하지만 이 단건 경로는 미커버였다(결제 입력 폼 a11y 미검증 = 최대 리스크).
 *
 * 시드 작품: 오윤 〈소리꾼Ⅱ〉(open edition). 단건 결제 페이지는 status가 sold/reserved면
 * 작품 상세로 redirect하는데, open edition은 개별 sold 처리되지 않아 항상 결제 UI로 렌더돼
 * CI에서 안정적. (unique 회화는 판매 시 redirect되어 테스트가 깨질 수 있음.)
 */
const SEED_ARTWORK_ID = '0e9ce433-07b6-4762-9f21-38938edb1847';

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze();
  expect(results.violations).toEqual([]);
}

for (const locale of ['ko', 'en'] as const) {
  test(`/${locale}/checkout/[artworkId] 단건 결제 폼 — WCAG AA a11y 위반 없음`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/checkout/${SEED_ARTWORK_ID}`, { waitUntil: 'domcontentloaded' });

    // 결제 폼이 실제로 렌더됐는지 확인(redirect/notFound가 아닌 결제 UI).
    await expect(
      page.getByRole('heading', {
        name: locale === 'en' ? 'Checkout' : '결제',
        exact: true,
      })
    ).toBeVisible({ timeout: 10_000 });

    await expectNoA11yViolations(page);
  });
}
