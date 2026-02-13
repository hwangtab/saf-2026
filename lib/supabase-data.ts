import { cache } from 'react';
import { hasSupabaseConfig, supabase } from './supabase';
import { formatPriceForDisplay } from '@/lib/utils';
import { artworks as fallbackArtworks, getArtworkById } from '@/content/saf2026-artworks';
import { newsArticles } from '@/content/news';
import { faqs } from '@/content/faq';
import { testimonials } from '@/content/testimonials';
import { exhibitionReviews } from '@/content/reviews';
import type { Artwork, ExhibitionReview, NewsArticle } from '@/types';

const isMissingTableError = (error: any) => error?.code === '42P01';
const ARTWORK_SELECT_COLUMNS =
  'id, artist_id, title, description, size, material, year, edition, price, images, shop_url, status';
const ARTIST_SELECT_COLUMNS = 'id, name_ko, bio, history';

const mapArtworkRow = (item: any, artist?: any): Artwork => ({
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
  profile: artist?.profile || artist?.bio || '', // Support both bio and profile fields
  history: artist?.history || '',
});

export const getSupabaseArtworks = cache(async (): Promise<Artwork[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackArtworks;
  }

  // Fetch artworks first
  const { data: artworksData, error: artworksError } = await supabase
    .from('artworks')
    .select(ARTWORK_SELECT_COLUMNS)
    .eq('is_hidden', false);

  if (artworksError) {
    if (isMissingTableError(artworksError)) {
      return fallbackArtworks;
    }
    console.error('Error fetching artworks from Supabase:', artworksError);
    return [];
  }

  // Fetch all artists to join in JS
  const { data: artistsData, error: artistsError } = await supabase
    .from('artists')
    .select(ARTIST_SELECT_COLUMNS);

  if (artistsError) {
    if (isMissingTableError(artistsError)) {
      return fallbackArtworks;
    }
    console.error('Error fetching artists from Supabase:', artistsError);
    return [];
  }

  const artistMap = new Map((artistsData || []).map((a: any) => [a.id, a]));

  return (artworksData || []).map((item: any) =>
    mapArtworkRow(item, artistMap.get(item.artist_id))
  );
});

export const getSupabaseArtworkById = cache(async (id: string): Promise<Artwork | null> => {
  if (!hasSupabaseConfig || !supabase) {
    return getArtworkById(id) || null;
  }

  const { data: artwork, error: artworkError } = await supabase
    .from('artworks')
    .select(ARTWORK_SELECT_COLUMNS)
    .eq('id', id)
    .single();

  if (artworkError) {
    if (isMissingTableError(artworkError)) {
      return getArtworkById(id) || null;
    }
    console.error(`Error fetching artwork ${id} from Supabase:`, artworkError);
    return null;
  }

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select(ARTIST_SELECT_COLUMNS)
    .eq('id', artwork.artist_id)
    .single();

  if (artistError) {
    if (isMissingTableError(artistError)) {
      return getArtworkById(id) || null;
    }
    console.error(`Error fetching artist for artwork ${id}:`, artistError);
  }

  return mapArtworkRow(artwork, artist);
});

export const getSupabaseArtworksByArtist = cache(async (artistName: string): Promise<Artwork[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackArtworks.filter((a) => a.artist === artistName);
  }

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select(ARTIST_SELECT_COLUMNS)
    .eq('name_ko', artistName)
    .limit(1)
    .maybeSingle();

  if (artistError) {
    if (isMissingTableError(artistError)) {
      return fallbackArtworks.filter((a) => a.artist === artistName);
    }
    console.error(`Error fetching artist ${artistName} from Supabase:`, artistError);
    return [];
  }

  if (!artist) {
    return [];
  }

  const { data: artworksData, error: artworksError } = await supabase
    .from('artworks')
    .select(ARTWORK_SELECT_COLUMNS)
    .eq('artist_id', artist.id)
    .eq('is_hidden', false);

  if (artworksError) {
    if (isMissingTableError(artworksError)) {
      return fallbackArtworks.filter((a) => a.artist === artistName);
    }
    console.error(`Error fetching artworks for artist ${artistName}:`, artworksError);
    return [];
  }

  return (artworksData || []).map((item: any) => mapArtworkRow(item, artist));
});

export const getSupabaseTestimonials = cache(
  async (): Promise<{ category: string; items: any[] }[]> => {
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
    const grouped = (data || []).reduce((acc: any, item: any) => {
      if (!acc[item.category]) {
        acc[item.category] = { category: item.category, items: [] };
      }
      acc[item.category].items.push({
        quote: item.quote,
        author: item.author,
        context: item.context || '',
      });
      return acc;
    }, {});

    return Object.values(grouped);
  }
);

export const getSupabaseFAQs = cache(async (): Promise<{ question: string; answer: string }[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return faqs.map((item) => ({ question: item.question, answer: item.answer }));
  }

  const { data, error } = await supabase
    .from('faq')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return faqs.map((item) => ({ question: item.question, answer: item.answer }));
    }
    console.error('Error fetching FAQs from Supabase:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    question: item.question,
    answer: item.answer,
  }));
});

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

  return (data || []).map((item: any) => {
    const parsedRating = typeof item.rating === 'number' ? item.rating : parseFloat(item.rating);
    return {
      id: item.id,
      author: item.author,
      role: item.role || '',
      rating: Number.isFinite(parsedRating) ? parsedRating : 0,
      comment: item.comment,
      date: item.date,
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

  return (data || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    source: item.source || '',
    date: item.date,
    link: item.link || '',
    thumbnail: item.thumbnail || '',
    description: item.description || '',
  }));
});

export const getSupabaseArtistsByOwner = cache(async (ownerId: string): Promise<any[]> => {
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
