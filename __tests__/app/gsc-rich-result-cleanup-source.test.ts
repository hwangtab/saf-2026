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
});
