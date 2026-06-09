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
});
