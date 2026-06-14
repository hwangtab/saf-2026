/**
 * 회귀 가드: 결제 랜딩(success/fail)은 server `searchParams`에 의존하면 안 된다.
 *
 * Next.js 16의 미들웨어 rewrite는 default-locale(`/checkout/...`) 경로의 path params는
 * 보존하지만 query(searchParams)를 server component에 전달하지 못한다. 그 결과 토스가
 * locale 없는 successUrl로 결제자를 돌려보내면 결제 파라미터가 유실되어 confirm이 실행되지
 * 못하고 카드결제 전체가 pending_payment로 죽는 사고가 있었다(2026-05-22 ~ 05-30 회귀).
 *
 * 따라서:
 *  - page.tsx(server)는 `searchParams`를 받지 않는다(얇은 wrapper).
 *  - SuccessClient/FailClient(client)가 `window.location.search`에서 직접 읽는다
 *    (브라우저 주소창 query는 internal rewrite와 무관하게 원본 유지).
 *
 * 누군가 server searchParams로 되돌리면 이 테스트가 즉시 잡는다.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
// 주석에서 회귀 이유를 설명하며 "searchParams"를 언급하므로, 코드만 검사하도록 주석 제거.
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

const SUCCESS_PAGE = 'app/[locale]/checkout/[artworkId]/success/page.tsx';
const FAIL_PAGE = 'app/[locale]/checkout/[artworkId]/fail/page.tsx';
const SUCCESS_CLIENT = 'app/[locale]/checkout/[artworkId]/success/SuccessClient.tsx';
const FAIL_CLIENT = 'app/[locale]/checkout/[artworkId]/fail/FailClient.tsx';
const KO_CHECKOUT_CLIENT = 'app/[locale]/checkout/[artworkId]/CheckoutClient.tsx';
const EN_CHECKOUT_CLIENT = 'app/[locale]/checkout/[artworkId]/OverseasCheckoutClient.tsx';

describe('checkout landing pages must not depend on server searchParams', () => {
  it.each([SUCCESS_PAGE, FAIL_PAGE])('%s does not consume server searchParams', (rel) => {
    const src = stripComments(read(rel));
    expect(src).not.toMatch(/searchParams/);
  });

  it.each([SUCCESS_CLIENT, FAIL_CLIENT])('%s reads window.location.search on the client', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/window\.location\.search/);
    expect(src.startsWith("'use client'")).toBe(true);
  });

  it('success client forwards checkoutToken to confirm and bank transfer verification', () => {
    const src = read(SUCCESS_CLIENT);

    expect(src).toContain("sp.get('checkoutToken')");
    expect(src).toContain('restorePendingCheckout(orderId, artworkId)');
    expect(src).toContain('verifyBankTransferLanding(orderId, checkoutToken)');
  });

  it('fail client cancels pending landing orders from URL or session fallback token', () => {
    const src = read(FAIL_CLIENT);

    expect(src).toContain("sp.get('checkoutToken')");
    expect(src).toContain("restorePendingCheckout(orderId, canUseLatestFallback ? artworkId : '')");
    expect(src).toContain('const canUseLatestFallback = !orderId && Boolean(code)');
    expect(src).toContain('if (landingOrderId && checkoutToken)');
    expect(src).toContain('cancelLandingOrder(landingOrderId, checkoutToken)');
    expect(src).toContain('cancelLatestLandingOrder(artworkId)');
  });

  it('card and hosted checkout URLs do not carry checkoutToken query before Toss appends params', () => {
    const koSrc = read(KO_CHECKOUT_CLIENT);
    const enSrc = read(EN_CHECKOUT_CLIENT);

    expect(koSrc).toContain('rememberPendingCheckout(artworkId, orderNo, checkoutToken)');
    expect(enSrc).toContain(
      'rememberPendingCheckout(artworkId, orderNo, checkoutToken, successCurrency)'
    );
    expect(koSrc).toContain(
      'const successUrl = `${window.location.origin}/checkout/${artworkId}/success`;'
    );
    expect(koSrc).toContain(
      'const failUrl = `${window.location.origin}/checkout/${artworkId}/fail`;'
    );
    expect(enSrc).toContain(
      'const successUrl = `${window.location.origin}/en/checkout/${artworkId}/success`;'
    );
    expect(enSrc).toContain(
      'const failUrl = `${window.location.origin}/en/checkout/${artworkId}/fail`;'
    );
  });
});
