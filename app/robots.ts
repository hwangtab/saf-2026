import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/exhibitor/',
          '/login',
          '/signup',
          '/onboarding',
          '/terms-consent',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Claude-Web',
          'anthropic-ai',
          'Google-Extended',
          'Googlebot-Extended',
          'PerplexityBot',
          'CCBot',
          'meta-externalagent',
          'Applebot-Extended',
          'cohere-ai',
          'Diffbot',
        ],
        allow: '/',
      },
      {
        userAgent: 'Yeti',
        allow: '/',
      },
      {
        userAgent: ['AdsBot-Google', 'MJ12bot', 'DotBot'],
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL.replace(/\/$/, '')}/sitemap.xml`,
  };
}
