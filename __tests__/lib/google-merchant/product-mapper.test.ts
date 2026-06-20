import {
  buildMerchantProductInput,
  getMerchantProductInputName,
  shouldSyncArtworkToMerchant,
} from '@/lib/google-merchant/product-mapper';
import type { Artwork } from '@/types';

const baseArtwork: Artwork = {
  id: '844d9a04-779f-4a9e-832e-77b70fcfbf0b',
  artist: '홍길동',
  title: '행복한 나날 2020',
  description: '밝은 색면으로 구성한 회화 작품입니다.',
  size: '53x45.5cm',
  material: '캔버스에 유채',
  year: '2020',
  edition: '원화',
  price: '₩1,200,000',
  images: [
    'https://example.supabase.co/storage/v1/object/public/artworks/art-1/main__original.webp',
    'https://example.supabase.co/storage/v1/object/public/artworks/art-1/detail__original.webp',
  ],
  category: '회화',
};

function attrValue(productInput: ReturnType<typeof buildMerchantProductInput>, name: string) {
  return productInput.customAttributes.find((attr) => attr.name === name)?.value;
}

describe('Google Merchant product mapper', () => {
  it('maps an available priced artwork to a Merchant API v1 ProductInput', () => {
    const productInput = buildMerchantProductInput(baseArtwork);

    expect(productInput).toMatchObject({
      offerId: baseArtwork.id,
      contentLanguage: 'ko',
      feedLabel: 'KR',
    });
    expect(attrValue(productInput, 'title')).toBe('행복한 나날 2020 - 홍길동');
    expect(attrValue(productInput, 'link')).toBe(
      'https://www.saf2026.com/artworks/844d9a04-779f-4a9e-832e-77b70fcfbf0b'
    );
    expect(attrValue(productInput, 'image_link')).toBe(baseArtwork.images[0]);
    expect(attrValue(productInput, 'additional_image_link')).toBe(baseArtwork.images[1]);
    expect(attrValue(productInput, 'price')).toBe('1200000 KRW');
    expect(attrValue(productInput, 'availability')).toBe('in_stock');
    expect(attrValue(productInput, 'condition')).toBe('new');
    expect(attrValue(productInput, 'identifier_exists')).toBe('no');
    expect(attrValue(productInput, 'brand')).toBe('씨앗페');
    expect(attrValue(productInput, 'custom_label_0')).toBe('홍길동');
    expect(attrValue(productInput, 'custom_label_1')).toBe('회화');
  });

  it('excludes unavailable or incomplete artworks before syncing', () => {
    expect(shouldSyncArtworkToMerchant({ ...baseArtwork, sold: true }).sync).toBe(false);
    expect(shouldSyncArtworkToMerchant({ ...baseArtwork, reserved: true }).sync).toBe(false);
    expect(shouldSyncArtworkToMerchant({ ...baseArtwork, hidden: true }).sync).toBe(false);
    expect(shouldSyncArtworkToMerchant({ ...baseArtwork, price: '확인 중' }).sync).toBe(false);
    expect(shouldSyncArtworkToMerchant({ ...baseArtwork, images: [] }).sync).toBe(false);
  });

  it('uses a stable encoded ProductInput resource name', () => {
    expect(getMerchantProductInputName('accounts/123456', baseArtwork.id)).toBe(
      'accounts/123456/productInputs/a29-S1J-ODQ0ZDlhMDQtNzc5Zi00YTllLTgzMmUtNzdiNzBmY2ZiZjBi'
    );
  });
});
