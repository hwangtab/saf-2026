import { SITE_URL } from '@/lib/constants';
import { containsHangul } from '@/lib/search-utils';

export interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQSchema(faqs: FAQItem[], locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq, index) => ({
      '@type': 'Question',
      name: isEnglish && containsHangul(faq.question) ? `FAQ ${index + 1}` : faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          isEnglish && containsHangul(faq.answer)
            ? 'This answer is currently available in Korean.'
            : faq.answer,
      },
    })),
  };
}

export interface VideoSchemaInput {
  title: string;
  description: string;
  youtubeId: string;
  uploadDate?: string;
  transcript?: string;
}

export function generateVideoSchema(video: VideoSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`,
    uploadDate: video.uploadDate || '2023-03-26',
    contentUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
    transcript: video.transcript,
    publisher: {
      '@type': 'Organization',
      name: '한국스마트협동조합',
      url: SITE_URL,
    },
  };
}

export interface NewsArticleSchemaInput {
  title: string;
  description: string;
  datePublished: string;
  image: string;
  url: string;
  publisherName: string;
}

export function generateNewsArticleSchema(article: NewsArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.description,
    image: [article.image],
    datePublished: article.datePublished,
    author: [
      {
        '@type': 'Organization',
        name: article.publisherName,
      },
    ],
    publisher: {
      '@type': 'Organization',
      name: article.publisherName,
      url: article.url,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'article h3', 'article p'],
    },
  };
}

export function generateSpeakableSchema(cssSelectors: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SpeakableSpecification',
    cssSelector: cssSelectors,
  };
}
