import { readFileSync } from 'fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('checkout payment availability source', () => {
  it('artwork detail and checkout pages use checkout availability instead of provider-agnostic payment mode', () => {
    expect(read('app/[locale]/artworks/[id]/page.tsx')).toContain('getCheckoutAvailability');
    expect(read('app/[locale]/checkout/[artworkId]/page.tsx')).toContain('getCheckoutAvailability');
    expect(read('app/[locale]/checkout/page.tsx')).toContain('getCheckoutAvailability');
  });
});
