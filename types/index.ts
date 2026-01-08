export interface Artist {
  id: string;
  name: string;
  role: 'musician' | 'artist' | 'performer';
  description?: string;
  image?: string;
  link?: string;
}

export interface Artwork {
  id: string;
  artist: string;
  title: string;
  description: string;
  profile?: string;
  history?: string;
  size: string;
  material: string;
  year: string;
  edition: string;
  price: string;
  image: string;
  shopUrl?: string;
  sold?: boolean;
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
