import { UserRole } from './database.types';

export type { UserRole };

export type ArtistRole =
  | 'musician'
  | 'artist'
  | 'performer'
  | 'photographer'
  | 'sculptor'
  | 'calligrapher'
  | 'printmaker'
  | 'designer';

export interface ArtistData {
  profile: string;
  history: string;
  owner_id?: string;
}

export type EditionType = 'unique' | 'limited' | 'open';

// Base artwork data structure (from DB/Files)
export interface BaseArtwork {
  id: string;
  artist: string;
  title: string;
  description?: string;
  size: string;
  material: string;
  year: string;
  edition: string;
  edition_type?: EditionType;
  edition_limit?: number | null;
  price: string;
  images: string[];
  shopUrl?: string;
  sold?: boolean;
  hidden?: boolean;
}

export interface ArtworkSale {
  id: string;
  artwork_id: string;
  sale_price: number; // Integer (KRW)
  sold_at: string; // ISO timestamp
  quantity: number;
  buyer_name?: string | null;
  note?: string | null;
  created_at?: string;
}

// Artwork with hydrated artist data (for UI)
export interface HydratedArtwork extends BaseArtwork {
  profile?: string;
  history?: string;
}

// Backward compatibility alias
export type Artwork = HydratedArtwork;

// Lightweight artwork shape for gallery/list UIs
export type ArtworkListItem = Omit<HydratedArtwork, 'profile' | 'history'>;

export interface ArtworkCardData {
  id: string;
  artist: string;
  title: string;
  images: string[];
  price: string;
  sold?: boolean;
  material?: string;
  size?: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  thumbnail?: string;
  transcript?: string; // AI-friendly summary or transcript
}

export interface TestimonialItem {
  quote: string;
  author: string;
  context?: string;
}

export interface TestimonialCategory {
  category: string;
  items: TestimonialItem[];
}

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  date: string;
  link: string;
  thumbnail?: string;
  description?: string;
}

export interface ExhibitionReview {
  id?: string;
  author: string;
  role?: string;
  rating: number;
  comment: string;
  date: string;
}

export interface StatisticItem {
  id: string;
  label: string;
  value: number;
  unit: string;
  description?: string;
}

export interface PageMetadata {
  title: string;
  description: string;
  image?: string;
  keywords?: string[];
}

export type SortOption = 'artist-asc' | 'title-asc' | 'price-desc' | 'price-asc';

export interface NavigationItem {
  name: string;
  href: string;
  external?: boolean;
  items?: NavigationItem[];
  description?: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}
