import { cache } from 'react';
import { supabase } from './supabase';
import { formatPriceForDisplay } from '@/lib/utils';
import type { Artwork, ExhibitionReview, NewsArticle } from '@/types';

export const getSupabaseArtworks = cache(async (): Promise<Artwork[]> => {
  // Fetch artworks first
  const { data: artworksData, error: artworksError } = await supabase
    .from('artworks')
    .select('*')
    .eq('is_hidden', false);

  if (artworksError) {
    console.error('Error fetching artworks from Supabase:', artworksError);
    return [];
  }

  // Fetch all artists to join in JS
  const { data: artistsData, error: artistsError } = await supabase.from('artists').select('*');

  if (artistsError) {
    console.error('Error fetching artists from Supabase:', artistsError);
    return [];
  }

  const artistMap = new Map((artistsData || []).map((a: any) => [a.id, a]));

  return (artworksData || []).map((item: any) => {
    const artist = artistMap.get(item.artist_id);
    return {
      id: item.id,
      artist: artist?.name_ko || 'Unknown Artist',
      title: item.title,
      description: item.description || '',
      size: item.size || '',
      material: item.material || '',
      year: item.year || '',
      edition: item.edition || '',
      price: formatPriceForDisplay(item.price),
      image: item.images?.[0] || '',
      shopUrl: item.shop_url || '',
      sold: item.status === 'sold' || item.status === 'reserved',
      profile: artist?.profile || artist?.bio || '', // Support both bio and profile fields
      history: artist?.history || '',
    };
  });
});

export const getSupabaseArtworkById = cache(async (id: string): Promise<Artwork | null> => {
  const { data: artwork, error: artworkError } = await supabase
    .from('artworks')
    .select('*')
    .eq('id', id)
    .single();

  if (artworkError) {
    console.error(`Error fetching artwork ${id} from Supabase:`, artworkError);
    return null;
  }

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artwork.artist_id)
    .single();

  if (artistError) {
    console.error(`Error fetching artist for artwork ${id}:`, artistError);
  }

  return {
    id: artwork.id,
    artist: artist?.name_ko || 'Unknown Artist',
    title: artwork.title,
    description: artwork.description || '',
    size: artwork.size || '',
    material: artwork.material || '',
    year: artwork.year || '',
    edition: artwork.edition || '',
    price: formatPriceForDisplay(artwork.price),
    image: artwork.images?.[0] || '',
    shopUrl: artwork.shop_url || '',
    sold: artwork.status === 'sold' || artwork.status === 'reserved',
    profile: artist?.profile || artist?.bio || '',
    history: artist?.history || '',
  };
});

export async function getSupabaseArtworksByArtist(artistName: string): Promise<Artwork[]> {
  const artworks = await getSupabaseArtworks();
  return artworks.filter((a) => a.artist === artistName);
}

export const getSupabaseTestimonials = cache(
  async (): Promise<{ category: string; items: any[] }[]> => {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
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
  const { data, error } = await supabase
    .from('faq')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching FAQs from Supabase:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    question: item.question,
    answer: item.answer,
  }));
});

export const getSupabaseReviews = cache(async (): Promise<ExhibitionReview[]> => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
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
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
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
