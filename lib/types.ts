// Artist Type
export interface Artist {
  id: string;
  name: string;
  role: 'musician' | 'artist' | 'performer';
  description?: string;
  image?: string;
  link?: string;
}

// News/Article Type
export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  date: string;
  link: string;
  thumbnail?: string;
  description?: string;
}

// Statistics Type
export interface StatisticItem {
  id: string;
  label: string;
  value: number;
  unit: string;
  description?: string;
}

// Page Metadata
export interface PageMetadata {
  title: string;
  description: string;
  image?: string;
  keywords?: string[];
}
