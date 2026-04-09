import { SITE_URL } from '@/lib/constants';
import { BreadcrumbItem } from '@/types';

const toAbsoluteUrl = (url: string): string => {
  try {
    const absoluteUrl = new URL(url, SITE_URL);
    if (absoluteUrl.pathname === '/' && !absoluteUrl.search && !absoluteUrl.hash) {
      return absoluteUrl.origin;
    }
    return absoluteUrl.toString();
  } catch {
    return SITE_URL;
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
