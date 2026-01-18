import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
        crawlDelay: 1,
      },
      {
        userAgent: [
          'GPTBot',
          'Claude-Web',
          'Google-Extended',
          'PerplexityBot',
          'CCBot',
          'anthropic-ai',
        ],
        allow: '/',
      },
      {
        userAgent: ['AdsBot-Google', 'MJ12bot', 'DotBot'],
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
