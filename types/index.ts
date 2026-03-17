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

export type TaxType = 'A' | 'B' | 'C';

export const ARTWORK_CATEGORIES = [
  '회화',
  '한국화',
  '판화',
  '사후판화',
  '드로잉',
  '조각',
  '도자/공예',
  '사진',
  '아트프린트',
  '혼합매체',
  '디지털아트',
] as const;

// Base artwork data structure (from DB/Files)
export interface BaseArtwork {
  id: string;
  artist: string;
  title: string;
  admin_product_name?: string | null;
  description?: string;
  size: string;
  material: string;
  year: string;
  edition: string;
  edition_type?: EditionType;
  edition_limit?: number | null;
  tax_type?: TaxType;
  category?: string;
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
  source?: 'manual' | 'cafe24' | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  note?: string | null;
  external_order_id?: string | null;
  external_order_item_code?: string | null;
  created_at?: string;
  voided_at?: string | null;
  void_reason?: string | null;
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

export interface ChangelogEntry {
  hash: string;
  type: 'feat' | 'fix' | 'perf';
  scope: string | null;
  subject: string;
  body: string | null;
  date: string;
  author: string;
}

export type FeedbackCategory = 'bug' | 'improvement' | 'question' | 'other';
export type FeedbackStatus = 'open' | 'reviewing' | 'resolved' | 'closed';

export interface Feedback {
  id: string;
  user_id: string;
  category: FeedbackCategory;
  page_url: string | null;
  title: string;
  description: string;
  status: FeedbackStatus;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  user_email?: string;
}
