import { SITE_URL } from '@/lib/constants';
import { BreadcrumbItem } from '@/types';

const toAbsoluteUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return SITE_URL;

  const isAbsoluteUrl = /^https?:\/\//i.test(trimmed);
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  try {
    const absoluteUrl = isAbsoluteUrl ? new URL(trimmed) : new URL(normalizedPath, SITE_URL);
    if (absoluteUrl.pathname === '/' && !absoluteUrl.search && !absoluteUrl.hash) {
      return absoluteUrl.origin;
    }
    return absoluteUrl.toString();
  } catch {
    if (isAbsoluteUrl) return SITE_URL;
    const fallbackUrl = new URL(encodeURI(normalizedPath), SITE_URL);
    return fallbackUrl.toString();
  }
};

export function createBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.url),
    })),
  };
}
