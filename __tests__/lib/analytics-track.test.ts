import { track } from '@vercel/analytics';
import { trackEvent } from '@/lib/analytics/track';

jest.mock('@vercel/analytics', () => ({
  track: jest.fn(),
}));

describe('trackEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'gtag', {
      value: jest.fn(),
      writable: true,
      configurable: true,
    });
  });

  it('sends primitive params to Vercel while sending GA4 ecommerce item payload separately', () => {
    trackEvent(
      'purchase',
      {
        transaction_id: 'SAF-ORDER-1',
        value: 500000,
        currency: 'KRW',
        artwork_id: 'art-1',
        artwork_title: '봄의 정원',
        artist: '김작가',
      },
      {
        ga4Params: {
          transaction_id: 'SAF-ORDER-1',
          value: 500000,
          currency: 'KRW',
          items: [
            {
              item_id: 'art-1',
              item_name: '봄의 정원',
              item_brand: '김작가',
              item_category: 'artwork',
              price: 500000,
              quantity: 1,
            },
          ],
        },
      }
    );

    expect(track).toHaveBeenCalledWith('purchase', {
      transaction_id: 'SAF-ORDER-1',
      value: 500000,
      currency: 'KRW',
      artwork_id: 'art-1',
      artwork_title: '봄의 정원',
      artist: '김작가',
    });
    expect(window.gtag).toHaveBeenCalledWith('event', 'purchase', {
      transaction_id: 'SAF-ORDER-1',
      value: 500000,
      currency: 'KRW',
      items: [
        {
          item_id: 'art-1',
          item_name: '봄의 정원',
          item_brand: '김작가',
          item_category: 'artwork',
          price: 500000,
          quantity: 1,
        },
      ],
    });
  });
});
