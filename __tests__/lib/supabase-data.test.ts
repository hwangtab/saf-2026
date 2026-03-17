/**
 * Supabase data fallback logic tests
 *
 * Verifies that data fetching functions correctly fall back to static content
 * when Supabase is unavailable or returns errors.
 */

// Static content imports for comparison
import { artworks as staticArtworks } from '@/content/saf2026-artworks';
import { faqs as staticFaqs } from '@/content/faq';
import { testimonials as staticTestimonials } from '@/content/testimonials';
import { exhibitionReviews as staticReviews } from '@/content/reviews';

// Mock next/cache
jest.mock('next/cache', () => ({
  unstable_cache: (fn: Function) => fn,
}));

// Mock react cache as passthrough
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn: Function) => fn,
}));

// --- Scenario 1: No Supabase config ---

describe('Supabase fallback: no config', () => {
  beforeEach(() => {
    jest.resetModules();
    // Ensure env vars are missing
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    // Restore env for other tests
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder';
  });

  it('getSupabaseArtworks returns static artworks when no config', async () => {
    const { getSupabaseArtworks } = await import('@/lib/supabase-data');
    const result = await getSupabaseArtworks();
    expect(result.length).toBe(staticArtworks.length);
    expect(result[0].id).toBe(staticArtworks[0].id);
  });

  it('getSupabaseFAQs returns static FAQs when no config', async () => {
    const { getSupabaseFAQs } = await import('@/lib/supabase-data');
    const result = await getSupabaseFAQs('ko');
    expect(result).toEqual(staticFaqs);
  });

  it('getSupabaseTestimonials returns static testimonials when no config', async () => {
    const { getSupabaseTestimonials } = await import('@/lib/supabase-data');
    const result = await getSupabaseTestimonials();
    expect(result).toEqual(staticTestimonials);
  });

  it('getSupabaseReviews returns static reviews when no config', async () => {
    const { getSupabaseReviews } = await import('@/lib/supabase-data');
    const result = await getSupabaseReviews();
    expect(result).toEqual(staticReviews);
  });
});

// --- Scenario 2: Supabase config exists but query fails ---

describe('Supabase fallback: query error', () => {
  const mockSelect = jest.fn();
  const mockFrom = jest.fn(() => ({
    select: mockSelect,
  }));

  beforeEach(() => {
    jest.resetModules();

    // Set env vars so hasSupabaseConfig is true
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    // Mock supabase module with error-returning client
    jest.mock('@/lib/supabase', () => ({
      hasSupabaseConfig: true,
      supabase: {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                data: null,
                error: { message: 'connection refused' },
              }),
              neq: () => ({
                neq: () => ({
                  limit: () => ({
                    data: null,
                    error: { message: 'connection refused' },
                  }),
                }),
              }),
              maybeSingle: () => ({
                data: null,
                error: { message: 'connection refused' },
              }),
            }),
            order: () => ({
              data: null,
              error: { message: 'connection refused' },
            }),
          }),
        }),
      },
    }));
  });

  it('getSupabaseArtworks falls back to static on Supabase error', async () => {
    const { getSupabaseArtworks } = await import('@/lib/supabase-data');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await getSupabaseArtworks();
    expect(result).toEqual(staticArtworks);
    expect(result.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });
});

// --- Scenario 3: Static content integrity ---

describe('Static content integrity', () => {
  it('static artworks have required fields', () => {
    for (const artwork of staticArtworks) {
      expect(artwork.id).toBeDefined();
      expect(artwork.title).toBeDefined();
      expect(artwork.artist).toBeDefined();
      expect(artwork.images).toBeDefined();
      expect(Array.isArray(artwork.images)).toBe(true);
    }
  });

  it('static FAQs have question and answer', () => {
    for (const faq of staticFaqs) {
      expect(faq.question).toBeDefined();
      expect(faq.question.length).toBeGreaterThan(0);
      expect(faq.answer).toBeDefined();
      expect(faq.answer.length).toBeGreaterThan(0);
    }
  });

  it('static testimonials have required fields', () => {
    for (const category of staticTestimonials) {
      expect(category.category).toBeDefined();
      expect(category.items).toBeDefined();
      expect(Array.isArray(category.items)).toBe(true);
      for (const item of category.items) {
        expect(item.quote).toBeDefined();
        expect(item.author).toBeDefined();
      }
    }
  });
});
