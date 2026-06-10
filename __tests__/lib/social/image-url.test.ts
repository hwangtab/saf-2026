import { artworkPublicUrl, resolvePublicImageUrl } from '@/lib/social/image-url';

describe('resolvePublicImageUrl', () => {
  it('이미 https 절대 URL이면 그대로 반환', () => {
    const url = 'https://proj.supabase.co/storage/v1/object/public/artworks/a__original.jpg';
    expect(resolvePublicImageUrl(url)).toBe(url);
  });

  it('http는 https로 승격', () => {
    expect(resolvePublicImageUrl('http://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });

  it('사이트 루트 상대 경로는 SITE_URL로 절대화', () => {
    expect(resolvePublicImageUrl('/images/og-image.jpg')).toMatch(
      /^https?:\/\/.+\/images\/og-image\.jpg$/
    );
  });

  it('빈 값/null이면 null', () => {
    expect(resolvePublicImageUrl(null)).toBeNull();
    expect(resolvePublicImageUrl(undefined)).toBeNull();
    expect(resolvePublicImageUrl('')).toBeNull();
  });
});

describe('artworkPublicUrl', () => {
  it('기본 로케일 ko로 작품 상세 URL 생성', () => {
    expect(artworkPublicUrl('42')).toMatch(/\/ko\/artworks\/42$/);
  });

  it('en 로케일 지정 가능', () => {
    expect(artworkPublicUrl('42', 'en')).toMatch(/\/en\/artworks\/42$/);
  });
});
