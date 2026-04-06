import { SITE_URL, CONTACT } from '@/lib/constants';
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
    dateModified: video.uploadDate || '2023-03-26',
    contentUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
    transcript: video.transcript,
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: '한국스마트협동조합',
      url: SITE_URL,
    },
  };
}

export interface NewsArticleSchemaInput {
  title: string;
  description: string;
  datePublished: string;
  /** 기사 수정일 — 없으면 datePublished로 폴백 */
  dateModified?: string;
  image: string;
  url: string;
  /** 원본 언론사 이름 (author로 표시됨) */
  sourceName: string;
}

export function generateNewsArticleSchema(article: NewsArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.description,
    ...(article.description.length > 100 && { articleBody: article.description }),
    url: article.url,
    image: [article.image],
    datePublished: article.datePublished,
    dateModified: article.dateModified ?? article.datePublished,
    isAccessibleForFree: true,
    isPartOf: { '@id': `${SITE_URL}#website` },
    author: [
      {
        '@type': 'Organization',
        name: article.sourceName,
      },
    ],
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        // Google NewsArticle 요건: 너비 최대 600px, 높이 최대 60px — 85x60 전용 로고
        url: `${SITE_URL}/images/logo/publisher-logo.png`,
        width: 85,
        height: 60,
      },
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
