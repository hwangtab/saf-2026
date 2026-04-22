import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { hasSupabaseConfig, supabase } from './supabase';
import { formatPriceForDisplay } from '@/lib/utils';
import {
  sanitizeTextForRscPayload,
  sanitizeNullableTextForRscPayload,
} from '@/lib/utils/text-sanitizer';
import { artworks as fallbackArtworks, getArtworkById } from '@/content/saf2026-artworks';
import { newsArticles } from '@/content/news';
import { faqs, faqsEn, getFaqsByLocale } from '@/content/faq';
import { testimonials } from '@/content/testimonials';
import { exhibitionReviews } from '@/content/reviews';
import type { Artwork, ExhibitionReview, NewsArticle, Story, TestimonialCategory } from '@/types';
import { stories as fallbackStories } from '@/content/stories';
import { containsHangul } from '@/lib/search-utils';

type ArtworkRow = {
  id: string;
  artist_id: string | null;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  size: string | null;
  material: string | null;
  year: string | null;
  edition: string | null;
  price: string | null;
  images: string[] | null;
  shop_url: string | null;
  status: string | null;
  sold_at: string | null;
  category: string | null;
};

type ArtistRow = {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  bio: string | null;
  bio_en: string | null;
  profile?: string | null;
  history: string | null;
  history_en: string | null;
};

type TestimonialRow = {
  category: string;
  quote: string;
  author: string;
  context: string | null;
};

type ReviewRow = {
  id: string;
  author: string;
  role: string | null;
  rating: number | string;
  comment: string;
  date: string;
};

type NewsRow = {
  id: string;
  title: string;
  source: string | null;
  date: string;
  link: string | null;
  thumbnail: string | null;
  description: string | null;
};

type FAQRow = {
  question: string;
  answer: string;
  question_en?: string | null;
  answer_en?: string | null;
};

const ARTWORK_SELECT_COLUMNS =
  'id, artist_id, title, title_en, description, description_en, size, material, year, edition, price, images, shop_url, status, sold_at, category';
const ARTIST_SELECT_COLUMNS = 'id, name_ko, name_en, bio, bio_en, history, history_en';
const ARTWORK_DATA_REVALIDATE_SECONDS = 300;

function pickRandomItems<T>(items: T[], limit: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, limit);
}

const mapArtworkRow = (item: ArtworkRow, artist?: ArtistRow | null): Artwork => ({
  id: item.id,
  artist: sanitizeTextForRscPayload(artist?.name_ko || 'Unknown Artist'),
  artist_en: sanitizeNullableTextForRscPayload(artist?.name_en) || undefined,
  title: sanitizeTextForRscPayload(item.title),
  title_en: sanitizeNullableTextForRscPayload(item.title_en) || undefined,
  description: sanitizeTextForRscPayload(item.description || ''),
  description_en: sanitizeNullableTextForRscPayload(item.description_en) || undefined,
  size: sanitizeTextForRscPayload(item.size || ''),
  material: sanitizeTextForRscPayload(item.material || ''),
  year: sanitizeTextForRscPayload(item.year || ''),
  edition: sanitizeTextForRscPayload(item.edition || ''),
  price: formatPriceForDisplay(item.price),
  images: item.images || [],
  shopUrl: item.shop_url || '',
  sold: item.status === 'sold',
  reserved: item.status === 'reserved',
  sold_at: item.sold_at || undefined,
  category: item.category || undefined,
  profile: sanitizeTextForRscPayload(artist?.bio || ''),
  profile_en: sanitizeNullableTextForRscPayload(artist?.bio_en) || undefined,
  history: sanitizeTextForRscPayload(artist?.history || ''),
  history_en: sanitizeNullableTextForRscPayload(artist?.history_en) || undefined,
});

const getSupabaseArtworksUncached = async (): Promise<Artwork[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackArtworks;
  }

  // Fetch artworks with artist data in a single query
  const { data, error } = await supabase
    .from('artworks')
    .select(
      `
      ${ARTWORK_SELECT_COLUMNS},
      artists (${ARTIST_SELECT_COLUMNS})
    `
    )
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching artworks from Supabase:', error);
    return fallbackArtworks;
  }

  return (data || []).map((item) =>
    mapArtworkRow(item as ArtworkRow, item.artists as unknown as ArtistRow | null)
  );
};

const getSupabaseArtworksCached = unstable_cache(
  async () => getSupabaseArtworksUncached(),
  ['supabase-artworks-v3'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getSupabaseArtworks = cache(
  async (): Promise<Artwork[]> => getSupabaseArtworksCached()
);

const getSupabaseHomepageArtworkCandidatesUncached = async (limit: number): Promise<Artwork[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackArtworks;
  }

  const { data, error } = await supabase
    .from('artworks')
    .select(
      `
      ${ARTWORK_SELECT_COLUMNS},
      artists (${ARTIST_SELECT_COLUMNS})
    `
    )
    .eq('is_hidden', false)
    .limit(limit * 3);

  if (error) {
    console.error('Error fetching homepage artworks from Supabase:', error);
    return fallbackArtworks;
  }

  return (data || []).map((item) =>
    mapArtworkRow(item as ArtworkRow, item.artists as unknown as ArtistRow | null)
  );
};

const getSupabaseHomepageArtworksCached = unstable_cache(
  async (limit: number) => getSupabaseHomepageArtworkCandidatesUncached(limit),
  ['supabase-homepage-artworks'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getSupabaseHomepageArtworks = cache(
  async (limit = 30): Promise<Artwork[]> =>
    pickRandomItems(await getSupabaseHomepageArtworksCached(limit), limit)
);

const getSupabaseArtworksByCategoriesUncached = async (
  categories: string[],
  limit: number
): Promise<Artwork[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackArtworks.filter((a) => categories.includes(a.category || ''));
  }

  const { data, error } = await supabase
    .from('artworks')
    .select(
      `
      ${ARTWORK_SELECT_COLUMNS},
      artists (${ARTIST_SELECT_COLUMNS})
    `
    )
    .eq('is_hidden', false)
    .in('category', categories)
    .limit(limit * 3);

  if (error) {
    console.error('Error fetching artworks by categories from Supabase:', error);
    return fallbackArtworks.filter((a) => categories.includes(a.category || ''));
  }

  return (data || []).map((item) =>
    mapArtworkRow(item as ArtworkRow, item.artists as unknown as ArtistRow | null)
  );
};

const getSupabaseArtworksByCategoriesCached = unstable_cache(
  async (categories: string[], limit: number) =>
    getSupabaseArtworksByCategoriesUncached(categories, limit),
  ['supabase-artworks-by-categories'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getSupabaseArtworksByCategories = cache(
  async (categories: string[], limit = 20): Promise<Artwork[]> =>
    pickRandomItems(await getSupabaseArtworksByCategoriesCached(categories, limit), limit)
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getSupabaseArtworkByIdUncached = async (id: string): Promise<Artwork | null> => {
  if (!hasSupabaseConfig || !supabase) {
    return getArtworkById(id) || null;
  }

  // Legacy numeric IDs (e.g. "20", "157")는 middleware에서 매핑되거나 404 처리되어야 함.
  // 여기까지 numeric이 흘러왔다면 정상 흐름이 아니므로 정적 fallback 사용 금지 —
  // UUID 페이지와 중복 색인되는 것 차단. (GSC "크롤링됨-색인 미생성" 대응)
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  const { data: artwork, error } = await supabase
    .from('artworks')
    .select(
      `
      ${ARTWORK_SELECT_COLUMNS},
      artists (${ARTIST_SELECT_COLUMNS})
    `
    )
    .eq('id', id)
    .eq('is_hidden', false)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching artwork ${id} from Supabase:`, error);
    return getArtworkById(id) || null;
  }

  if (!artwork) {
    return getArtworkById(id) || null;
  }

  return mapArtworkRow(artwork as ArtworkRow, artwork.artists as unknown as ArtistRow | null);
};

const getSupabaseArtworkByIdCached = unstable_cache(
  async (id: string) => getSupabaseArtworkByIdUncached(id),
  ['supabase-artwork-by-id-v3'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getSupabaseArtworkById = cache(
  async (id: string): Promise<Artwork | null> => getSupabaseArtworkByIdCached(id)
);

const getSupabaseArtworksByArtistUncached = async (artistName: string): Promise<Artwork[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackArtworks.filter((a) => a.artist === artistName);
  }

  // First, find the artist to get their ID (optimized to select only needed fields)
  // distinct join is not directly supported in this way for filtering by parent field without inner join
  // But we can use !inner to filter artworks by artist name directly if we wanted,
  // but keeping it simple: Find artist -> Find artworks

  // Actually, we can do it in one query if we query artworks and filter by artists.name_ko
  // But usage of !inner on foreign table is required.

  const { data, error } = await supabase
    .from('artworks')
    .select(
      `
      ${ARTWORK_SELECT_COLUMNS},
      artists!inner (${ARTIST_SELECT_COLUMNS})
    `
    )
    .eq('artists.name_ko', artistName)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching artworks for artist ${artistName}:`, error);
    return fallbackArtworks.filter((a) => a.artist === artistName);
  }

  return (data || []).map((item) =>
    mapArtworkRow(item as ArtworkRow, item.artists as unknown as ArtistRow | null)
  );
};

const getSupabaseArtworksByArtistCached = unstable_cache(
  async (artistName: string) => getSupabaseArtworksByArtistUncached(artistName),
  ['supabase-artworks-by-artist-v3'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getSupabaseArtworksByArtist = cache(
  async (artistName: string): Promise<Artwork[]> => getSupabaseArtworksByArtistCached(artistName)
);

// --- Related artworks by category (for artwork detail page) ---

/**
 * 카테고리별 경량 쿼리. 작품 상세의 "같은 카테고리" 추천 4~6점용. 판매 가능(`sold=false`)만.
 * TTFB 최적화 목적 — 기존 getSupabaseArtworks() 330개 전체 대신 limit 적용으로 payload 95% 감소.
 */
const getArtworksByCategoryLightUncached = async (
  category: string,
  limit: number
): Promise<Artwork[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackArtworks.filter((a) => a.category === category && !a.sold).slice(0, limit);
  }

  const { data, error } = await supabase
    .from('artworks')
    .select(`${ARTWORK_SELECT_COLUMNS}, artists (${ARTIST_SELECT_COLUMNS})`)
    .eq('is_hidden', false)
    .eq('category', category)
    .eq('sold', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`Error fetching artworks by category ${category}:`, error);
    return fallbackArtworks.filter((a) => a.category === category && !a.sold).slice(0, limit);
  }

  return (data || []).map((item) =>
    mapArtworkRow(item as ArtworkRow, item.artists as unknown as ArtistRow | null)
  );
};

const getArtworksByCategoryLightCached = unstable_cache(
  async (category: string, limit: number) => getArtworksByCategoryLightUncached(category, limit),
  ['supabase-artworks-by-category-light-v1'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getArtworksByCategoryLight = cache(
  async (category: string, limit = 4): Promise<Artwork[]> =>
    getArtworksByCategoryLightCached(category, limit)
);

// --- Available categories list (for artist/detail page category links) ---

/**
 * 사용 중인 카테고리 문자열 배열만. 작가 페이지 카테고리 바로가기 체크용.
 * 기존 getSupabaseArtworks() 호출 (330개 row) → 12개 정도 distinct 카테고리 문자열로 축소.
 */
const getAvailableArtworkCategoriesUncached = async (): Promise<string[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return Array.from(
      new Set(fallbackArtworks.map((a) => a.category).filter((c): c is string => Boolean(c)))
    );
  }

  const { data, error } = await supabase
    .from('artworks')
    .select('category')
    .eq('is_hidden', false)
    .not('category', 'is', null);

  if (error) {
    console.error('Error fetching available categories:', error);
    return [];
  }

  return Array.from(
    new Set(
      (data || [])
        .map((row) => (row as { category: string | null }).category)
        .filter((c): c is string => Boolean(c))
    )
  );
};

const getAvailableArtworkCategoriesCached = unstable_cache(
  async () => getAvailableArtworkCategoriesUncached(),
  ['supabase-available-categories-v1'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getAvailableArtworkCategories = cache(
  async (): Promise<string[]> => getAvailableArtworkCategoriesCached()
);

// --- Recently sold artworks (for trust signal) ---

const getRecentlySoldArtworksUncached = async (limit: number): Promise<Artwork[]> => {
  if (!hasSupabaseConfig || !supabase) return [];

  const { data, error } = await supabase
    .from('artworks')
    .select(
      `
      ${ARTWORK_SELECT_COLUMNS},
      artists (${ARTIST_SELECT_COLUMNS})
    `
    )
    .eq('is_hidden', false)
    .not('sold_at', 'is', null)
    .order('sold_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recently sold artworks:', error);
    return [];
  }

  return (data || []).map((item) =>
    mapArtworkRow(item as ArtworkRow, item.artists as unknown as ArtistRow | null)
  );
};

const getRecentlySoldArtworksCached = unstable_cache(
  async (limit: number) => getRecentlySoldArtworksUncached(limit),
  ['supabase-recently-sold-artworks'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getRecentlySoldArtworks = cache(
  async (limit = 6, excludeId?: string): Promise<Artwork[]> => {
    const all = await getRecentlySoldArtworksCached(limit + 1);
    const filtered = excludeId ? all.filter((a) => a.id !== excludeId) : all;
    return filtered.slice(0, limit);
  }
);

// --- Total sold count (for trust signal) ---

const getTotalSoldCountUncached = async (): Promise<number> => {
  if (!hasSupabaseConfig || !supabase) return 0;

  const { count, error } = await supabase
    .from('artworks')
    .select('*', { count: 'exact', head: true })
    .eq('is_hidden', false)
    .not('sold_at', 'is', null);

  if (error) {
    console.error('Error fetching total sold count:', error);
    return 0;
  }

  return count || 0;
};

const getTotalSoldCountCached = unstable_cache(
  async () => getTotalSoldCountUncached(),
  ['supabase-total-sold-count'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getTotalSoldCount = cache(async (): Promise<number> => getTotalSoldCountCached());

const getSupabaseTestimonialsUncached = async (): Promise<TestimonialCategory[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return testimonials;
  }

  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('category', { ascending: true });

  if (error) {
    console.error('Error fetching testimonials from Supabase:', error);
    return testimonials;
  }

  // Group by category
  const grouped = (data || []).reduce<Record<string, TestimonialCategory>>((acc, item) => {
    const row = item as TestimonialRow;
    if (!acc[row.category]) {
      acc[row.category] = { category: row.category, items: [] };
    }
    acc[row.category].items.push({
      quote: sanitizeTextForRscPayload(row.quote),
      author: sanitizeTextForRscPayload(row.author),
      context: sanitizeTextForRscPayload(row.context || ''),
    });
    return acc;
  }, {});

  return Object.values(grouped);
};

const getSupabaseTestimonialsCached = unstable_cache(
  async () => getSupabaseTestimonialsUncached(),
  ['supabase-testimonials'],
  { revalidate: 3600, tags: ['testimonials'] }
);

export const getSupabaseTestimonials = cache(
  async (): Promise<TestimonialCategory[]> => getSupabaseTestimonialsCached()
);

const getSupabaseFAQsUncached = async (
  locale: 'ko' | 'en' = 'ko'
): Promise<{ question: string; answer: string }[]> => {
  const fallbackFaqs = getFaqsByLocale(locale);
  const fallbackByQuestion = new Map(
    faqs.map((faq, index) => [faq.question, faqsEn[index]] as const)
  );

  const localizeFaqRows = (rows: FAQRow[]): { question: string; answer: string }[] => {
    if (locale === 'ko') {
      return rows.map((row) => ({
        question: sanitizeTextForRscPayload(row.question),
        answer: sanitizeTextForRscPayload(row.answer),
      }));
    }

    return rows.map((row, index) => {
      const questionEn = row.question_en?.trim();
      const answerEn = row.answer_en?.trim();
      const fallbackByQuestionMatch = fallbackByQuestion.get(row.question.trim());
      const fallbackByIndex = fallbackFaqs[index];
      const fallback = fallbackByQuestionMatch || fallbackByIndex;

      if (questionEn && answerEn) {
        return {
          question: sanitizeTextForRscPayload(questionEn),
          answer: sanitizeTextForRscPayload(answerEn),
        };
      }

      return {
        question: sanitizeTextForRscPayload(
          questionEn ||
            fallback?.question ||
            (containsHangul(row.question) ? `FAQ ${index + 1}` : row.question)
        ),
        answer: sanitizeTextForRscPayload(
          answerEn ||
            fallback?.answer ||
            (containsHangul(row.answer)
              ? 'This answer is currently available in Korean.'
              : row.answer)
        ),
      };
    });
  };

  if (!hasSupabaseConfig || !supabase) {
    return fallbackFaqs;
  }

  const { data, error } = await supabase
    .from('faq')
    .select('question, answer, question_en, answer_en')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching FAQs from Supabase:', error);
    return fallbackFaqs;
  }

  const rows = (data || []) as FAQRow[];
  return localizeFaqRows(rows);
};

const getSupabaseFAQsCached = unstable_cache(
  async (locale: 'ko' | 'en') => getSupabaseFAQsUncached(locale),
  ['supabase-faqs'],
  { revalidate: 3600, tags: ['faqs'] }
);

export const getSupabaseFAQs = cache(
  async (locale: 'ko' | 'en' = 'ko'): Promise<{ question: string; answer: string }[]> =>
    getSupabaseFAQsCached(locale)
);

const getSupabaseReviewsUncached = async (): Promise<ExhibitionReview[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return exhibitionReviews;
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching reviews from Supabase:', error);
    return exhibitionReviews;
  }

  const reviews = (data || []).map((item) => {
    const row = item as ReviewRow;
    const parsedRating =
      typeof row.rating === 'number' ? row.rating : parseFloat(String(row.rating));
    return {
      id: row.id,
      author: sanitizeTextForRscPayload(row.author),
      role: sanitizeTextForRscPayload(row.role || ''),
      rating: Number.isFinite(parsedRating) ? parsedRating : 0,
      comment: sanitizeTextForRscPayload(row.comment),
      date: row.date,
    };
  });

  // Deduplicate by comment + author (defensive: duplicate rows may have different IDs)
  const seen = new Set<string>();
  return reviews.filter((r) => {
    const key = `${r.comment}::${r.author}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getSupabaseReviewsCached = unstable_cache(
  async () => getSupabaseReviewsUncached(),
  ['supabase-reviews'],
  { revalidate: 3600, tags: ['reviews'] }
);

export const getSupabaseReviews = cache(
  async (): Promise<ExhibitionReview[]> => getSupabaseReviewsCached()
);

const getSupabaseNewsUncached = async (): Promise<NewsArticle[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return newsArticles;
  }

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching news from Supabase:', error);
    return newsArticles;
  }

  return (data || []).map((item) => {
    const row = item as NewsRow;
    return {
      id: row.id,
      title: sanitizeTextForRscPayload(row.title),
      source: sanitizeTextForRscPayload(row.source || ''),
      date: row.date,
      link: row.link || '',
      thumbnail: row.thumbnail || '',
      description: sanitizeTextForRscPayload(row.description || ''),
    };
  });
};

const getSupabaseNewsCached = unstable_cache(
  async () => getSupabaseNewsUncached(),
  ['supabase-news'],
  { revalidate: 1800, tags: ['news'] }
);

export const getSupabaseNews = cache(async (): Promise<NewsArticle[]> => getSupabaseNewsCached());

export const getSupabaseNewsById = cache(async (id: string): Promise<NewsArticle | null> => {
  const allNews = await getSupabaseNews();
  return allNews.find((article) => article.id === id) ?? null;
});

// ─── Stories (매거진) ───

type StoryRow = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  category: string;
  excerpt: string | null;
  excerpt_en: string | null;
  body: string;
  body_en: string | null;
  thumbnail: string | null;
  author: string | null;
  published_at: string;
  updated_at: string | null;
  is_published: boolean;
  display_order: number;
  tags: string[] | null;
};

const mapStoryRow = (row: StoryRow): Story => ({
  id: row.id,
  slug: row.slug,
  title: sanitizeTextForRscPayload(row.title),
  title_en: sanitizeNullableTextForRscPayload(row.title_en) || undefined,
  category: row.category as Story['category'],
  excerpt: sanitizeTextForRscPayload(row.excerpt || ''),
  excerpt_en: sanitizeNullableTextForRscPayload(row.excerpt_en) || undefined,
  body: sanitizeTextForRscPayload(row.body),
  body_en: sanitizeNullableTextForRscPayload(row.body_en) || undefined,
  thumbnail: row.thumbnail || undefined,
  author: sanitizeNullableTextForRscPayload(row.author) || undefined,
  published_at: row.published_at,
  updated_at: row.updated_at || undefined,
  is_published: row.is_published,
  display_order: row.display_order,
  tags: row.tags || undefined,
});

const getSupabaseStoriesUncached = async (): Promise<Story[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackStories;
  }

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stories from Supabase:', error);
    return fallbackStories;
  }

  return (data || []).map((item) => mapStoryRow(item as StoryRow));
};

const getSupabaseStoriesCached = unstable_cache(
  async () => getSupabaseStoriesUncached(),
  ['supabase-stories'],
  { revalidate: 600, tags: ['stories'] }
);

export const getSupabaseStories = cache(async (): Promise<Story[]> => getSupabaseStoriesCached());

export const getSupabaseStoryBySlug = cache(async (slug: string): Promise<Story | null> => {
  const all = await getSupabaseStories();
  return all.find((s) => s.slug === slug) ?? null;
});

export const getSupabaseArtistsByOwner = cache(async (ownerId: string): Promise<ArtistRow[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('artists')
    .select(ARTIST_SELECT_COLUMNS)
    .eq('owner_id', ownerId);

  if (error) {
    console.error(`Error fetching artists for owner ${ownerId}:`, error);
    return [];
  }

  return data || [];
});
