import { readFileSync } from 'node:fs';
import path from 'node:path';

const ARTWORK_DETAIL_PAGE_PATH = path.join(
  process.cwd(),
  'app',
  '[locale]',
  'artworks',
  '[id]',
  'page.tsx'
);
const ARTIST_PAGE_PATH = path.join(
  process.cwd(),
  'app',
  '[locale]',
  'artworks',
  'artist',
  '[artist]',
  'page.tsx'
);
const OUR_REALITY_PAGE_PATH = path.join(
  process.cwd(),
  'app',
  '[locale]',
  'our-reality',
  'page.tsx'
);

describe('GSC rich result cleanup wiring', () => {
  it('should not inject artwork detail FAQPage JSON-LD', () => {
    const source = readFileSync(ARTWORK_DETAIL_PAGE_PATH, 'utf8');

    expect(source).not.toContain('generateArtworkPurchaseFAQ');
    expect(source).not.toContain('generateArtworkSpecificFAQ');
    expect(source).not.toContain('<JsonLdScript data={faqSchema} />');
  });

  it('should not point CollectionPage.mainEntity at ItemList on artist pages', () => {
    const source = readFileSync(ARTIST_PAGE_PATH, 'utf8');

    expect(source).not.toContain("mainEntity: { '@id': `${artistPageUrl}#item-list` }");
  });

  it('should not publish testimonials as Review rich results on our-reality', () => {
    const source = readFileSync(OUR_REALITY_PAGE_PATH, 'utf8');

    expect(source).not.toContain('const testimonialReviews = testimonialsData');
    expect(source).not.toContain("'@type': 'Review' as const");
    expect(source).not.toContain('...testimonialReviews');
  });

  // ClaimReview는 reviewRating 때문에 Google이 Review snippet으로 오인 → itemReviewed
  // (Claim) "객체 유형 무효" 에러를 유발한다. Fact Check rich result는 승인 발행자 전용이라
  // SAF은 어차피 자격이 없어 발행 이득이 0이므로 제거함 (통계 시그널은 Dataset이 커버).
  it('should not publish ClaimReview JSON-LD on our-reality', () => {
    const source = readFileSync(OUR_REALITY_PAGE_PATH, 'utf8');

    expect(source).not.toContain('generateSAFClaimReviews');
    expect(source).not.toContain('claimReviews');
    expect(source).not.toContain('ClaimReview');
  });
});
