import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const KO_CHECKOUT = 'app/[locale]/checkout/[artworkId]/CheckoutClient.tsx';
const EN_CHECKOUT = 'app/[locale]/checkout/[artworkId]/OverseasCheckoutClient.tsx';
const compact = (src: string) => src.replace(/\s+/g, '');

describe('checkout funnel ecommerce analytics', () => {
  it('adds GA4 item payloads to Korean begin_checkout and add_payment_info events', () => {
    const src = read(KO_CHECKOUT);
    const minified = compact(src);

    expect(src).toContain('buildCheckoutGa4Params');
    expect(minified).toContain("trackEvent('begin_checkout'");
    expect(minified).toContain("trackEvent('add_payment_info'");
    expect(src).toContain('ga4Params: buildCheckoutGa4Params');
    expect(src).toContain("item_category: 'artwork'");
    expect(src).toContain('payment_type: paymentChoice');
    expect(minified).toContain("trackEvent('checkout_error'");
    expect(src).toContain("'checkout_cancel'");
  });

  it('adds GA4 item payloads to overseas begin_checkout and add_payment_info events', () => {
    const src = read(EN_CHECKOUT);
    const minified = compact(src);

    expect(src).toContain('buildCheckoutGa4Params');
    expect(minified).toContain("trackEvent('begin_checkout'");
    expect(minified).toContain("trackEvent('add_payment_info'");
    expect(src).toContain('ga4Params: buildCheckoutGa4Params');
    expect(src).toContain("item_category: 'artwork'");
    expect(src).toContain('payment_type: paymentChoice');
    expect(minified).toContain("trackEvent('checkout_error'");
    expect(src).toContain("'checkout_cancel'");
    expect(src).toContain("'payment_initiate_failed'");
  });

  it('reduces checkout friction with optional address detail and transfer trust copy', () => {
    const form = read('app/[locale]/checkout/[artworkId]/BuyerInfoForm.tsx');
    const action = read('app/actions/checkout.ts');
    const koCheckout = read(KO_CHECKOUT);
    const enCheckout = read(EN_CHECKOUT);

    expect(form).toContain('optionalField');
    expect(form).toContain('addressDetailOptionalHint');
    expect(form).not.toContain('next.shippingAddressDetail = t');
    expect(action).toContain('if (!shippingAddress || !shippingPostalCode)');
    expect(action).toContain('shipping_address_detail: shippingAddressDetail?.trim() || null');
    expect(koCheckout).toContain('transferTrustTitle');
    expect(enCheckout).toContain('transferTrustTitle');
  });

  it('uses realistic artwork shipping timelines across checkout and guide copy', () => {
    const koMessages = read('messages/ko.json');
    const enMessages = read('messages/en.json');
    const legal = read('lib/legal-documents.ts');
    const qa = read('lib/schemas/qa-page.ts');
    const guide = read('app/[locale]/stories/category/[category]/page.tsx');
    const combined = [koMessages, enMessages, legal, qa, guide].join('\n');

    expect(combined).not.toContain('영업일 기준 1~3일');
    expect(combined).not.toContain('2~7일 내');
    expect(combined).not.toContain('promptly after payment');
    expect(combined).not.toContain('1–2 business days');
    expect(combined).not.toContain('3–5 business days');

    expect(koMessages).toContain('액자 제작이 필요한 작품은 제작 기간 때문에 보통 1~2주');
    expect(koMessages).toContain('액자 제작이 필요 없는 작품은 보통 3~4일');
    expect(koMessages).toContain('안전 포장');
    expect(enMessages).toContain('need custom framing may take 1-2 weeks');
    expect(enMessages).toContain('do not need framing usually arrive within 3-4 days');
    expect(legal).toContain('액자 제작이 필요한 작품은 제작 기간 때문에 보통 1~2주');
    expect(qa).toContain('do not need framing usually arrive within 3-4 days');
    expect(guide).toContain('액자 제작이 필요 없는 작품은 보통 3~4일');
  });
});
