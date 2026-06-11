import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const SUCCESS_CLIENT = 'app/[locale]/checkout/[artworkId]/success/SuccessClient.tsx';
const CONFIRM_ROUTE = 'app/api/payments/toss/confirm/route.ts';

describe('checkout success purchase analytics', () => {
  it('uses confirm analyticsItem to send GA4 ecommerce items on purchase', () => {
    const src = read(SUCCESS_CLIENT);

    expect(src).toContain('analyticsItem');
    expect(src).toContain('ga4Params');
    expect(src).toContain('items: [');
    expect(src).toContain("item_category: 'artwork'");
    expect(src).toContain('item_brand');
  });

  it('returns artwork item context from Toss confirm for success-page analytics', () => {
    const src = read(CONFIRM_ROUTE);

    expect(src).toContain('analyticsItem');
    expect(src).toContain('artworkId');
    expect(src).toContain('artworkTitle');
    expect(src).toContain('artistName');
    expect(src).toContain('itemAmount');
    expect(src).toContain('shippingAmount');
  });
});
