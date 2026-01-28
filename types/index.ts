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
}

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
  price: string;
  image: string;
  shopUrl?: string;
  sold?: boolean;
  hidden?: boolean;
}

// Artwork with hydrated artist data (for UI)
export interface HydratedArtwork extends BaseArtwork {
  profile?: string;
  history?: string;
}

// Backward compatibility alias
export type Artwork = HydratedArtwork;

export interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  thumbnail?: string;
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
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}
