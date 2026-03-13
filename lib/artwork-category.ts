/** Korean category → English display name */
export const CATEGORY_EN_MAP: Record<string, string> = {
  회화: 'Painting',
  한국화: 'Korean Painting',
  판화: 'Printmaking',
  사후판화: 'Posthumous Print',
  드로잉: 'Drawing',
  조각: 'Sculpture',
  '도자/공예': 'Ceramics/Craft',
  사진: 'Photography',
  아트프린트: 'Art Print',
  혼합매체: 'Mixed Media',
  디지털아트: 'Digital Art',
};

/** Get localized category label */
export function getCategoryLabel(value: string, locale: string): string {
  if (locale === 'en') {
    return CATEGORY_EN_MAP[value] || value;
  }
  return value;
}
