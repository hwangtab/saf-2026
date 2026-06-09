import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('sales funnel content links', () => {
  it('adds search-intent story sales blocks for GSC opportunity articles', () => {
    const src = read('app/[locale]/stories/[slug]/page.tsx');

    expect(src).toContain('SEARCH_TO_SALES_STORY_SLUGS');
    expect(src).toContain('editions-explained');
    expect(src).toContain('archival-pigment-print-photography');
    expect(src).toContain('prints-vs-originals-and-edition-numbers');
    expect(src).toContain('reading-art-sizes-ho-vs-cm');
    expect(src).toContain('story-search-intent-${story.slug}');
    expect(src).toContain('SalesArtworkSpotlight');
  });

  it('places an artist-page sales spotlight before the full gallery', () => {
    const src = read('app/[locale]/artworks/artist/[artist]/page.tsx');

    expect(src).toContain('featuredSalesArtworks');
    expect(src).toContain('구매 가능 작품');
    expect(src).toContain('artist-page-sales-${artistName}');
    expect(src).toContain('작가 작품 전체 보기');
  });

  it('excludes refunded and cancelled orders from commerce revenue RPCs', () => {
    const src = read('supabase/migrations/20260609050050_exclude_refunded_from_revenue_rpc.sql');

    expect(src).toContain('CREATE OR REPLACE FUNCTION is_revenue_order');
    expect(src).toContain("NOT IN ('cancelled', 'refunded', 'refund_requested')");
    expect(src).toContain('is_revenue_order(status, paid_at)');
    expect(src).toContain('is_revenue_order(o.status, o.paid_at)');
  });

  it('strengthens artwork detail purchase confidence and sold alternatives', () => {
    const cta = read('components/features/ArtworkPurchaseCTA.tsx');
    const detail = read('app/[locale]/artworks/[id]/page.tsx');

    expect(cta).toContain('PurchaseConfidenceStrip');
    expect(cta).toContain('confidenceFreeShipping');
    expect(cta).toContain('confidenceCertificate');
    expect(cta).toContain('purchase_consult_click');
    expect(cta).toContain('phoneConsult');
    expect(detail).toContain('soldAlternativeWorks');
    expect(detail).toContain('alternativeEyebrow');
  });

  it('tracks story recommendation placement and price bands', () => {
    const relatedCard = read('components/features/RelatedArtworkCard.tsx');
    const spotlight = read('components/features/SalesArtworkSpotlight.tsx');
    const story = read('app/[locale]/stories/[slug]/page.tsx');

    expect(relatedCard).toContain('price_band: getPriceBand');
    expect(relatedCard).toContain("placement = 'story_bottom_related'");
    expect(spotlight).toContain('story_slug: storySlug ?? null');
    expect(spotlight).toContain('price_band: getPriceBand');
    expect(story).toContain('placement="story_mid_intent"');
    expect(story).toContain('placement="story_bottom_related"');
  });

  it('adds admin commerce operating reports without counting cancelled revenue', () => {
    const action = read('app/actions/admin-analytics.ts');
    const panel = read('app/(portal)/admin/analytics/_components/CommercePanel.tsx');

    expect(action).toContain('pushCandidates');
    expect(action).toContain('recommendationSlots');
    expect(action).toContain('checkoutLeakage');
    expect(action).toContain("!['cancelled', 'refunded', 'refund_requested'].includes");
    expect(panel).toContain('pushCandidatesTitle');
    expect(panel).toContain('RecommendationSlotsTable');
    expect(panel).toContain('CheckoutLeakageTable');
  });
});
