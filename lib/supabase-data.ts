import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { hasSupabaseConfig, supabase } from './supabase';
import { formatPriceForDisplay } from '@/lib/utils';
import { artworks as fallbackArtworks, getArtworkById } from '@/content/saf2026-artworks';
import { newsArticles } from '@/content/news';
import { getFaqsByLocale } from '@/content/faq';
import { testimonials } from '@/content/testimonials';
import { exhibitionReviews } from '@/content/reviews';
import type { Artwork, ExhibitionReview, NewsArticle, TestimonialCategory } from '@/types';

type ArtworkRow = {
  id: string;
  artist_id: string | null;
  title: string;
  description: string | null;
  size: string | null;
  material: string | null;
  year: string | null;
  edition: string | null;
  price: string | null;
  images: string[] | null;
  shop_url: string | null;
  status: string | null;
  category: string | null;
};

type ArtistRow = {
  id: string;
  name_ko: string | null;
  bio: string | null;
  profile?: string | null;
  history: string | null;
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

const containsHangul = (value: string): boolean => /[가-힣]/.test(value);

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as { code?: string }).code === '42P01';
}
const ARTWORK_SELECT_COLUMNS =
  'id, artist_id, title, description, size, material, year, edition, price, images, shop_url, status, category';
const ARTIST_SELECT_COLUMNS = 'id, name_ko, bio, history';
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
  artist: artist?.name_ko || 'Unknown Artist',
  title: item.title,
  description: item.description || '',
  size: item.size || '',
  material: item.material || '',
  year: item.year || '',
  edition: item.edition || '',
  price: formatPriceForDisplay(item.price),
  images: item.images || [],
  shopUrl: item.shop_url || '',
  sold: item.status === 'sold' || item.status === 'reserved',
  category: item.category || undefined,
  profile: artist?.profile || artist?.bio || '', // Support both bio and profile fields
  history: artist?.history || '',
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
    if (isMissingTableError(error)) {
      return fallbackArtworks;
    }
    console.error('Error fetching artworks from Supabase:', error);
    return [];
  }

  return (data || []).map((item) =>
    mapArtworkRow(item as ArtworkRow, item.artists as unknown as ArtistRow | null)
  );
};

const getSupabaseArtworksCached = unstable_cache(
  async () => getSupabaseArtworksUncached(),
  ['supabase-artworks'],
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
    return fallbackArtworks.filter((artwork) => !artwork.sold);
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
    .neq('status', 'sold')
    .neq('status', 'reserved')
    .limit(limit * 3);

  if (error) {
    if (isMissingTableError(error)) {
      return fallbackArtworks.filter((artwork) => !artwork.sold);
    }
    console.error('Error fetching homepage artworks from Supabase:', error);
    return [];
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

const getSupabaseArtworkByIdUncached = async (id: string): Promise<Artwork | null> => {
  if (!hasSupabaseConfig || !supabase) {
    return getArtworkById(id) || null;
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
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return getArtworkById(id) || null;
    }
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
  ['supabase-artwork-by-id'],
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
    if (isMissingTableError(error)) {
      return fallbackArtworks.filter((a) => a.artist === artistName);
    }
    console.error(`Error fetching artworks for artist ${artistName}:`, error);
    return [];
  }

  return (data || []).map((item) =>
    mapArtworkRow(item as ArtworkRow, item.artists as unknown as ArtistRow | null)
  );
};

const getSupabaseArtworksByArtistCached = unstable_cache(
  async (artistName: string) => getSupabaseArtworksByArtistUncached(artistName),
  ['supabase-artworks-by-artist'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getSupabaseArtworksByArtist = cache(
  async (artistName: string): Promise<Artwork[]> => getSupabaseArtworksByArtistCached(artistName)
);

export const getSupabaseTestimonials = cache(async (): Promise<TestimonialCategory[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return testimonials;
  }

  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('category', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return testimonials;
    }
    console.error('Error fetching testimonials from Supabase:', error);
    return [];
  }

  // Group by category
  const grouped = (data || []).reduce<Record<string, TestimonialCategory>>((acc, item) => {
    const row = item as TestimonialRow;
    if (!acc[row.category]) {
      acc[row.category] = { category: row.category, items: [] };
    }
    acc[row.category].items.push({
      quote: row.quote,
      author: row.author,
      context: row.context || '',
    });
    return acc;
  }, {});

  return Object.values(grouped);
});

export const getSupabaseFAQs = cache(
  async (locale: 'ko' | 'en' = 'ko'): Promise<{ question: string; answer: string }[]> => {
    const fallbackFaqs = getFaqsByLocale(locale);

    const localizeFaqRows = (rows: FAQRow[]): { question: string; answer: string }[] => {
      if (locale === 'ko') {
        return rows.map((row) => ({ question: row.question, answer: row.answer }));
      }

      return rows.map((row, index) => {
        const questionEn = row.question_en?.trim();
        const answerEn = row.answer_en?.trim();

        if (questionEn && answerEn) {
          return { question: questionEn, answer: answerEn };
        }

        const fallback = fallbackFaqs[index];
        if (fallback) {
          return fallback;
        }

        return {
          question: containsHangul(row.question) ? `FAQ ${index + 1}` : row.question,
          answer: containsHangul(row.answer)
            ? 'This answer is currently available in Korean.'
            : row.answer,
        };
      });
    };

    if (!hasSupabaseConfig || !supabase) {
      return fallbackFaqs;
    }

    const { data, error } = await supabase
      .from('faq')
      .select('question, answer, question_en, answer_en')
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        return fallbackFaqs;
      }
      console.error('Error fetching FAQs from Supabase:', error);
      return fallbackFaqs;
    }

    const rows = (data || []) as FAQRow[];
    return localizeFaqRows(rows);
  }
);

export const getSupabaseReviews = cache(async (): Promise<ExhibitionReview[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return exhibitionReviews;
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return exhibitionReviews;
    }
    console.error('Error fetching reviews from Supabase:', error);
    return [];
  }

  return (data || []).map((item) => {
    const row = item as ReviewRow;
    const parsedRating =
      typeof row.rating === 'number' ? row.rating : parseFloat(String(row.rating));
    return {
      id: row.id,
      author: row.author,
      role: row.role || '',
      rating: Number.isFinite(parsedRating) ? parsedRating : 0,
      comment: row.comment,
      date: row.date,
    };
  });
});

export const getSupabaseNews = cache(async (): Promise<NewsArticle[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return newsArticles;
  }

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return newsArticles;
    }
    console.error('Error fetching news from Supabase:', error);
    return [];
  }

  return (data || []).map((item) => {
    const row = item as NewsRow;
    return {
      id: row.id,
      title: row.title,
      source: row.source || '',
      date: row.date,
      link: row.link || '',
      thumbnail: row.thumbnail || '',
      description: row.description || '',
    };
  });
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
    if (isMissingTableError(error)) {
      return [];
    }
    console.error(`Error fetching artists for owner ${ownerId}:`, error);
    return [];
  }

  return data || [];
});
