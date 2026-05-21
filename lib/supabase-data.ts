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
import type { ArtistNoticeRecord } from '@/lib/artist-notice';

// 빌드 phase 한정 module-level memo — 600+ 페이지를 prerender하면서 동일 쿼리를
// 반복 호출하면 Supabase statement_timeout 폭주(2026-05-11 회귀, 494c40b5 unstable_cache
// 제거 직후 발생). React cache는 request-scope라 SSG 페이지마다 새로 fetch함.
// 빌드 phase에서만 process가 살아있는 동안 한 번만 fetch하도록 module memo 도입.
// dev/prod runtime은 worker lifecycle별로 memo가 비워지고 page-level revalidate가 SSG
// 시점을 결정하므로 staleness 위험 없음.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const buildMemo = new Map<string, Promise<unknown>>();
function memoForBuild<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!isBuildPhase) return fn();
  if (!buildMemo.has(key)) buildMemo.set(key, fn());
  return buildMemo.get(key) as Promise<T>;
}

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
  tone: string[] | null;
  quote: string | null;
  quote_en: string | null;
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
  career_tier: string | null;
};

type TestimonialRow = {
  category: string;
  category_en: string | null;
  quote: string;
  quote_en: string | null;
  author: string;
  author_en: string | null;
  context: string | null;
  context_en: string | null;
};

type ReviewRow = {
  id: string;
  author: string;
  author_en: string | null;
  role: string | null;
  role_en: string | null;
  rating: number | string;
  comment: string;
  comment_en: string | null;
  date: string;
};

type NewsRow = {
  id: string;
  title: string;
  title_en: string | null;
  source: string | null;
  date: string;
  link: string | null;
  thumbnail: string | null;
  description: string | null;
  description_en: string | null;
};

type FAQRow = {
  question: string;
  answer: string;
  question_en?: string | null;
  answer_en?: string | null;
};

const ARTWORK_SELECT_COLUMNS =
  'id, artist_id, title, title_en, description, description_en, size, material, year, edition, price, images, shop_url, status, sold_at, category, tone, quote, quote_en';
const ARTIST_SELECT_COLUMNS = 'id, name_ko, name_en, bio, bio_en, history, history_en, career_tier';
const ARTWORK_DATA_REVALIDATE_SECONDS = 300;

// `.from('artworks').select('..., artists(...)')` 결과 row. supabase는 1:1 FK 조인을
// single object로 반환하지만, query에 따라 array로 떨어지기도 해 union으로 받음.
type ArtworkWithArtistRow = ArtworkRow & {
  artists: ArtistRow | ArtistRow[] | null;
};

function pickArtist(artists: ArtistRow | ArtistRow[] | null | undefined): ArtistRow | null {
  if (!artists) return null;
  return Array.isArray(artists) ? (artists[0] ?? null) : artists;
}

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
  tone: Array.isArray(item.tone) && item.tone.length ? item.tone : undefined,
  artistTier: artist?.career_tier || undefined,
  quote: sanitizeNullableTextForRscPayload(item.quote) || undefined,
  quote_en: sanitizeNullableTextForRscPayload(item.quote_en) || undefined,
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
    .order('created_at', { ascending: false })
    .returns<ArtworkWithArtistRow[]>();

  if (error) {
    console.error('Error fetching artworks from Supabase:', error);
    return fallbackArtworks;
  }

  return (data || []).map((item) => mapArtworkRow(item, pickArtist(item.artists)));
};

// unstable_cache 제거 — 365개 작품 전체에 description/history의 ko+en이 누적되며
// 2.14MB로 Vercel Data Cache 2MB 한도 초과 (dev/prod 모두 cache write 실패 경고).
// /en/special/oh-yoon·/en/artworks/artist/* 등 전체 작품 목록을 사용하는 페이지마다 동일
// 경고 폭주. stories와 동일 패턴(react cache request-scope만 유지) 적용 — 페이지 레벨
// revalidate가 SSG 시점을 결정하므로 추가 Data Cache 레이어 없어도 Supabase 호출 빈도 동일.
export const getSupabaseArtworks = cache(async (): Promise<Artwork[]> => {
  try {
    return await memoForBuild('artworks', getSupabaseArtworksUncached);
  } catch (err) {
    console.error('getSupabaseArtworks fallback:', err);
    return fallbackArtworks;
  }
});

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
    .limit(limit * 3)
    .returns<ArtworkWithArtistRow[]>();

  if (error) {
    console.error('Error fetching homepage artworks from Supabase:', error);
    return fallbackArtworks;
  }

  return (data || []).map((item) => mapArtworkRow(item, pickArtist(item.artists)));
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
    .limit(limit * 3)
    .returns<ArtworkWithArtistRow[]>();

  if (error) {
    console.error('Error fetching artworks by categories from Supabase:', error);
    return fallbackArtworks.filter((a) => categories.includes(a.category || ''));
  }

  return (data || []).map((item) => mapArtworkRow(item, pickArtist(item.artists)));
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
    .maybeSingle<ArtworkWithArtistRow>();

  if (error) {
    console.error(`Error fetching artwork ${id} from Supabase:`, error);
    return getArtworkById(id) || null;
  }

  if (!artwork) {
    return getArtworkById(id) || null;
  }

  return mapArtworkRow(artwork, pickArtist(artwork.artists));
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
    .order('created_at', { ascending: false })
    .returns<ArtworkWithArtistRow[]>();

  if (error) {
    console.error(`Error fetching artworks for artist ${artistName}:`, error);
    return fallbackArtworks.filter((a) => a.artist === artistName);
  }

  return (data || []).map((item) => mapArtworkRow(item, pickArtist(item.artists)));
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

// --- All artworks for a single category (for category listing pages) ---

/**
 * 카테고리 페이지 전용 단일 카테고리 쿼리 — sold 포함, limit 없음.
 * getSupabaseArtworks() 전체 365행 over-fetch 없이 해당 카테고리만 fetch.
 */
const getSupabaseArtworksByCategoryUncached = async (category: string): Promise<Artwork[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackArtworks.filter((a) => a.category === category);
  }

  const { data, error } = await supabase
    .from('artworks')
    .select(`${ARTWORK_SELECT_COLUMNS}, artists (${ARTIST_SELECT_COLUMNS})`)
    .eq('is_hidden', false)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .returns<ArtworkWithArtistRow[]>();

  if (error) {
    console.error(`Error fetching artworks for category ${category}:`, error);
    return fallbackArtworks.filter((a) => a.category === category);
  }

  return (data || []).map((item) => mapArtworkRow(item, pickArtist(item.artists)));
};

const getSupabaseArtworksByCategoryCached = unstable_cache(
  async (category: string) => getSupabaseArtworksByCategoryUncached(category),
  ['supabase-artworks-by-category-v1'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getSupabaseArtworksByCategory = cache(
  async (category: string): Promise<Artwork[]> => getSupabaseArtworksByCategoryCached(category)
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
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<ArtworkWithArtistRow[]>();

  if (error) {
    console.error(`Error fetching artworks by category ${category}:`, error);
    return fallbackArtworks.filter((a) => a.category === category && !a.sold).slice(0, limit);
  }

  return (data || []).map((item) => mapArtworkRow(item, pickArtist(item.artists)));
};

const getArtworksByCategoryLightCached = unstable_cache(
  async (category: string, limit: number) => getArtworksByCategoryLightUncached(category, limit),
  ['supabase-artworks-by-category-light-v2'],
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
    .limit(limit)
    .returns<ArtworkWithArtistRow[]>();

  if (error) {
    console.error('Error fetching recently sold artworks:', error);
    return [];
  }

  return (data || []).map((item) => mapArtworkRow(item, pickArtist(item.artists)));
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

// 빌드 시 generateStaticParams가 prerender할 인기 작품 ID 목록.
// 358 작품 전체를 prerender하면 Supabase Cloudflare 522 발생 → TOP N만 미리 빌드하고
// 나머지는 dynamicParams=true로 첫 요청 시 on-demand SSG.
//
// 정렬: 판매중 우선 (active 인벤토리 → 신규 트래픽 흡수) → created_at desc.
// id만 select해 빌드 부하 최소화.
const getPopularArtworkIdsUncached = async (limit: number): Promise<string[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackArtworks.slice(0, limit).map((a) => a.id);
  }
  const { data, error } = await supabase
    .from('artworks')
    .select('id, sold_at, created_at')
    .eq('is_hidden', false)
    .order('sold_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching popular artwork IDs:', error);
    return fallbackArtworks.slice(0, limit).map((a) => a.id);
  }
  return (data || []).map((row) => row.id as string);
};

const getPopularArtworkIdsCached = unstable_cache(
  async (limit: number) => getPopularArtworkIdsUncached(limit),
  ['supabase-popular-artwork-ids'],
  { revalidate: 3600, tags: ['artworks'] }
);

export const getPopularArtworkIds = cache(
  async (limit = 30): Promise<string[]> => getPopularArtworkIdsCached(limit)
);

// 빌드 시 prerender할 인기 작가 이름 목록 — 작품 수 desc 기준.
const getPopularArtistNamesUncached = async (limit: number): Promise<string[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return Array.from(new Set(fallbackArtworks.map((a) => a.artist))).slice(0, limit);
  }
  // artists 테이블 컬럼은 `name_ko`/`name_en`. 과거 `name` 사용은 PostgREST error로
  // production logs에 매번 `column artists_1.name does not exist` 기록되며 빌드 인기 작가
  // prerender가 fallback으로 떨어졌음.
  type PopularRow = { artist_id: string | null; artists: { name_ko: string | null } | null };
  const { data, error } = await supabase
    .from('artworks')
    .select('artist_id, artists(name_ko)')
    .eq('is_hidden', false)
    .returns<PopularRow[]>();

  if (error) {
    console.error('Error fetching popular artist names:', error);
    return Array.from(new Set(fallbackArtworks.map((a) => a.artist))).slice(0, limit);
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const name = row.artists?.name_ko?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
};

const getPopularArtistNamesCached = unstable_cache(
  async (limit: number) => getPopularArtistNamesUncached(limit),
  ['supabase-popular-artist-names'],
  { revalidate: 3600, tags: ['artworks'] }
);

export const getPopularArtistNames = cache(
  async (limit = 20): Promise<string[]> => getPopularArtistNamesCached(limit)
);

const getSupabaseTestimonialsUncached = async (): Promise<TestimonialCategory[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return testimonials;
  }

  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('category', { ascending: true })
    .returns<TestimonialRow[]>();

  if (error) {
    console.error('Error fetching testimonials from Supabase:', error);
    return testimonials;
  }

  // Group by category
  const grouped = (data ?? []).reduce<Record<string, TestimonialCategory>>((acc, row) => {
    if (!acc[row.category]) {
      acc[row.category] = {
        category: row.category,
        category_en: row.category_en ? sanitizeTextForRscPayload(row.category_en) : undefined,
        items: [],
      };
    }
    acc[row.category].items.push({
      quote: sanitizeTextForRscPayload(row.quote),
      quote_en: row.quote_en ? sanitizeTextForRscPayload(row.quote_en) : undefined,
      author: sanitizeTextForRscPayload(row.author),
      author_en: row.author_en ? sanitizeTextForRscPayload(row.author_en) : undefined,
      context: sanitizeTextForRscPayload(row.context || ''),
      context_en: row.context_en ? sanitizeTextForRscPayload(row.context_en) : undefined,
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
    .order('date', { ascending: false })
    .returns<ReviewRow[]>();

  if (error) {
    console.error('Error fetching reviews from Supabase:', error);
    return exhibitionReviews;
  }

  const reviews = (data ?? []).map((row) => {
    const parsedRating =
      typeof row.rating === 'number' ? row.rating : parseFloat(String(row.rating));
    return {
      id: row.id,
      author: sanitizeTextForRscPayload(row.author),
      author_en: row.author_en ? sanitizeTextForRscPayload(row.author_en) : undefined,
      role: sanitizeTextForRscPayload(row.role || ''),
      role_en: row.role_en ? sanitizeTextForRscPayload(row.role_en) : undefined,
      rating: Number.isFinite(parsedRating) ? parsedRating : 0,
      comment: sanitizeTextForRscPayload(row.comment),
      comment_en: row.comment_en ? sanitizeTextForRscPayload(row.comment_en) : undefined,
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
    .order('date', { ascending: false })
    .returns<NewsRow[]>();

  if (error) {
    console.error('Error fetching news from Supabase:', error);
    return newsArticles;
  }

  return (data ?? []).map((row) => {
    return {
      id: row.id,
      title: sanitizeTextForRscPayload(row.title),
      title_en: row.title_en ? sanitizeTextForRscPayload(row.title_en) : undefined,
      source: sanitizeTextForRscPayload(row.source || ''),
      date: row.date,
      link: row.link || '',
      thumbnail: row.thumbnail || '',
      description: sanitizeTextForRscPayload(row.description || ''),
      description_en: row.description_en
        ? sanitizeTextForRscPayload(row.description_en)
        : undefined,
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

  // 예약 발행(published_at > now)은 public 경로에서 제외 — listing·detail·sitemap·RSS·OG
  // 모두 이 함수를 거치므로 단일 출처에서 미래 글 차단. admin 큐레이션은 별도 함수.
  // RSS validator가 미래 날짜 "Implausible date" 경고로 처음 발견(2026-05-11 PDF).
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    // unstable_cache 제거 이후로 throw가 페이지를 500으로 만드는 부작용만 남음
    // (React cache는 request-scope라 캐시 오염 위험 없음). transient Supabase 응답 지연이
    // /artworks/artist/[name] 페이지 500을 발생시키던 회귀 — 빈 배열 fallback으로 변경.
    console.error('Error fetching stories from Supabase:', error);
    return [];
  }

  return (data || []).map((item) => mapStoryRow(item as StoryRow));
};

// unstable_cache 제거 — 매거진 본문(특히 영문 14,000자급)이 누적되며 2MB 한도 초과로
// 빌드 실패. 페이지 레벨 revalidate(/stories: 300s, /stories/[slug]: 1800s)가 SSG 시점을
// 결정하므로 Vercel Data Cache 추가 레이어 없어도 실제 호출 빈도는 동일.
// React cache()로 request-scope 중복 제거만 유지.
export const getSupabaseStories = cache(async (): Promise<Story[]> => {
  try {
    return await memoForBuild('stories', getSupabaseStoriesUncached);
  } catch (err) {
    console.error('getSupabaseStories fallback to empty array:', err);
    return fallbackStories;
  }
});

// sitemap·RSS·generateStaticParams 등 body·body_en 컬럼이 필요 없는 경로 전용 경량 fetch.
// 174편 × body 평균 8KB가 빌드 시 500~800회 누적되며 Supabase statement timeout(57014) 회귀를
// 일으키던 핵심 원인. 컬럼을 메타데이터만으로 축소하면 payload 약 95% 감소 → light variant는
// 2MB 한도 안에 들어와 unstable_cache 복원 가능.
export type StoryLight = {
  id: string;
  slug: string;
  title: string;
  title_en?: string;
  category: Story['category'];
  excerpt: string;
  excerpt_en?: string;
  thumbnail?: string;
  author?: string;
  published_at: string;
  updated_at?: string;
  tags?: string[];
};

const getSupabaseStoriesLightUncached = async (): Promise<StoryLight[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackStories.map(({ body: _b, body_en: _be, ...rest }) => rest);
  }

  const { data, error } = await supabase
    .from('stories')
    .select(
      'id, slug, title, title_en, category, excerpt, excerpt_en, thumbnail, author, published_at, updated_at, tags'
    )
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stories (light) from Supabase:', error);
    return fallbackStories.map(({ body: _b, body_en: _be, ...rest }) => rest);
  }

  return (data || []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: sanitizeTextForRscPayload(row.title),
    title_en: sanitizeNullableTextForRscPayload(row.title_en) || undefined,
    category: row.category as Story['category'],
    excerpt: sanitizeTextForRscPayload(row.excerpt || ''),
    excerpt_en: sanitizeNullableTextForRscPayload(row.excerpt_en) || undefined,
    thumbnail: row.thumbnail || undefined,
    author: sanitizeNullableTextForRscPayload(row.author) || undefined,
    published_at: row.published_at,
    updated_at: row.updated_at || undefined,
    tags: row.tags || undefined,
  }));
};

const getSupabaseStoriesLightCached = unstable_cache(
  async () => getSupabaseStoriesLightUncached(),
  ['supabase-stories-light-v1'],
  { revalidate: 600, tags: ['stories'] }
);

export const getSupabaseStoriesLight = cache(
  async (): Promise<StoryLight[]> => getSupabaseStoriesLightCached()
);

export const getSupabaseStoryBySlug = cache(async (slug: string): Promise<Story | null> => {
  const all = await getSupabaseStories();
  return all.find((s) => s.slug === slug) ?? null;
});

/**
 * 작가 이름(name_ko)으로 외부 링크(homepage/instagram)만 가벼이 조회.
 * Person schema의 sameAs 구성에 사용. 캐시 5분.
 */
export type ArtistExternalLinkRow = {
  homepage: string | null;
  instagram: string | null;
};

const getSupabaseArtistExternalLinksUncached = async (
  nameKo: string
): Promise<ArtistExternalLinkRow | null> => {
  if (!hasSupabaseConfig || !supabase) return null;

  const { data, error } = await supabase
    .from('artists')
    .select('homepage, instagram')
    .eq('name_ko', nameKo)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching artist external links for ${nameKo}:`, error);
    return null;
  }
  return data ?? null;
};

const getSupabaseArtistExternalLinksCached = unstable_cache(
  async (nameKo: string) => getSupabaseArtistExternalLinksUncached(nameKo),
  ['supabase-artist-external-links-v1'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artists'],
  }
);

export const getSupabaseArtistExternalLinks = cache(
  async (nameKo: string): Promise<ArtistExternalLinkRow | null> =>
    getSupabaseArtistExternalLinksCached(nameKo)
);

/**
 * 작가의 운영 공지 필드를 name_ko로 조회.
 * 작가 페이지·작품 상세 페이지에서 동일한 공지를 노출하기 위한 단일 출처.
 * 활성 판정은 호출 측에서 `lib/artist-notice.ts`의 `resolveActiveNotice`로 처리.
 */
const NOTICE_SELECT_COLUMNS =
  'notice_enabled, notice_type, notice_message, notice_message_en, notice_active_until';

const getSupabaseArtistNoticeByNameUncached = async (
  nameKo: string
): Promise<ArtistNoticeRecord | null> => {
  if (!hasSupabaseConfig || !supabase) return null;

  const { data, error } = await supabase
    .from('artists')
    .select(NOTICE_SELECT_COLUMNS)
    .eq('name_ko', nameKo)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching artist notice for ${nameKo}:`, error);
    return null;
  }
  return (data as ArtistNoticeRecord | null) ?? null;
};

const getSupabaseArtistNoticeByNameCached = unstable_cache(
  async (nameKo: string) => getSupabaseArtistNoticeByNameUncached(nameKo),
  ['supabase-artist-notice-v1'],
  {
    // 짧은 캐시 — 공지 토글 시 revalidatePath로 즉시 갱신, 이 캐시는 보조 안전망
    revalidate: 60,
    tags: ['artists', 'artist-notice'],
  }
);

export const getSupabaseArtistNoticeByName = cache(
  async (nameKo: string): Promise<ArtistNoticeRecord | null> =>
    getSupabaseArtistNoticeByNameCached(nameKo)
);

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

/** 위시리스트·배치 조회 — UUID ID 배열을 단일 쿼리로 가져온 뒤 static fallback 병합. */
export async function getArtworksByIds(ids: string[]): Promise<Artwork[]> {
  if (ids.length === 0) return [];

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidIds = ids.filter((id) => uuidRegex.test(id));
  const staticIds = ids.filter((id) => !uuidRegex.test(id));

  const staticArtworks = staticIds
    .map((id) => fallbackArtworks.find((a) => a.id === id))
    .filter((a): a is Artwork => a != null);

  if (!hasSupabaseConfig || !supabase || uuidIds.length === 0) {
    return [...staticArtworks];
  }

  const { data, error } = await supabase
    .from('artworks')
    .select(
      `
      ${ARTWORK_SELECT_COLUMNS},
      artists (${ARTIST_SELECT_COLUMNS})
    `
    )
    .in('id', uuidIds)
    .eq('is_hidden', false)
    .returns<ArtworkWithArtistRow[]>();

  if (error) {
    console.error('getArtworksByIds error:', error);
    return staticArtworks;
  }

  const supabaseArtworks = (data || []).map((item) =>
    mapArtworkRow(item, pickArtist(item.artists))
  );
  return [...supabaseArtworks, ...staticArtworks];
}
