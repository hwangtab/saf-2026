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
          '/en/admin/',
          '/dashboard/',
          '/en/dashboard/',
          '/exhibitor/',
          '/en/exhibitor/',
          '/login',
          '/en/login',
          '/signup',
          '/en/signup',
          '/onboarding',
          '/en/onboarding',
          '/terms-consent',
          '/en/terms-consent',
          '/checkout/',
          '/en/checkout/',
          '/stories?*',
          '/en/stories?*',
          '/artworks?*',
          '/en/artworks?*',
          '/news?*',
          '/en/news?*',
          '/*?*utm_*',
          '/*?*fbclid=*',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
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
