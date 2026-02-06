/**
 * Art Medium Taxonomy for SEO categorization
 * Enables faceted search and category-based SEO optimization
 */

export interface ArtMediumCategory {
  id: string;
  name: string;
  nameEn: string;
  schemaArtform: string;
  keywords: string[];
}

export const ART_MEDIUM_TAXONOMY: ArtMediumCategory[] = [
  {
    id: 'painting-oil',
    name: '유화',
    nameEn: 'Oil Painting',
    schemaArtform: 'Painting',
    keywords: ['oil on canvas', 'oil', '유화', 'ottchil', '옻칠', 'oil on linen'],
  },
  {
    id: 'painting-acrylic',
    name: '아크릴화',
    nameEn: 'Acrylic Painting',
    schemaArtform: 'Painting',
    keywords: ['acrylic', '아크릴', 'acrylic on canvas'],
  },
  {
    id: 'painting-mixed',
    name: '혼합매체',
    nameEn: 'Mixed Media',
    schemaArtform: 'Painting',
    keywords: ['mixed media', '혼합', 'mixed', 'collage', '콜라주'],
  },
  {
    id: 'painting-oriental',
    name: '동양화',
    nameEn: 'East Asian Painting',
    schemaArtform: 'Painting',
    keywords: ['동양화', '한지', '장지', '먹', '수묵', '채색', '화선지', '순지'],
  },
  {
    id: 'print-woodcut',
    name: '목판화',
    nameEn: 'Woodcut Print',
    schemaArtform: 'Print',
    keywords: ['목판', 'woodcut', '다색목판', 'wood block'],
  },
  {
    id: 'print-other',
    name: '판화',
    nameEn: 'Printmaking',
    schemaArtform: 'Print',
    keywords: [
      'print',
      '판화',
      '석판',
      'silkscreen',
      '실크스크린',
      'etching',
      '에칭',
      'lithograph',
    ],
  },
  {
    id: 'photography',
    name: '사진',
    nameEn: 'Photography',
    schemaArtform: 'Photograph',
    keywords: [
      'photo',
      'photograph',
      'pigment print',
      '디지털',
      'digital',
      '사진',
      'c-print',
      'inkjet',
      'archival',
    ],
  },
  {
    id: 'sculpture',
    name: '조각',
    nameEn: 'Sculpture',
    schemaArtform: 'Sculpture',
    keywords: ['resin', 'sculpture', '조각', 'bronze', '브론즈', 'marble', 'stone', '석고'],
  },
  {
    id: 'drawing',
    name: '드로잉',
    nameEn: 'Drawing',
    schemaArtform: 'Drawing',
    keywords: [
      '연필',
      'pencil',
      'drawing',
      '드로잉',
      '종이에',
      'paper',
      'charcoal',
      '목탄',
      'pastel',
    ],
  },
  {
    id: 'ceramics',
    name: '도자',
    nameEn: 'Ceramics',
    schemaArtform: 'Sculpture',
    keywords: ['도자', 'ceramic', '도예', 'pottery', 'porcelain', '자기'],
  },
];

/**
 * Classify artwork by material into a medium category
 */
export function classifyArtworkMedium(material: string): ArtMediumCategory | null {
  if (!material) return null;
  const lowerMaterial = material.toLowerCase();

  for (const category of ART_MEDIUM_TAXONOMY) {
    for (const keyword of category.keywords) {
      if (lowerMaterial.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Get Schema.org artform value for a material
 */
export function getArtformForSchema(material: string): string {
  const category = classifyArtworkMedium(material);
  return category?.schemaArtform || 'Visual Artwork';
}

/**
 * Get category keywords for SEO metadata
 */
export function getMediumKeywords(material: string): string[] {
  const category = classifyArtworkMedium(material);
  if (!category) return [];
  return [category.name, category.nameEn];
}
