import { SITE_URL, CONTACT } from '@/lib/constants';
import { containsHangul } from '@/lib/search-utils';

const DEFAULT_VIDEO_ISO_DATETIME = '2023-03-26T00:00:00+09:00';

const normalizeIsoDateTime = (value?: string): string => {
  if (!value) return DEFAULT_VIDEO_ISO_DATETIME;

  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_VIDEO_ISO_DATETIME;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00+09:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return `${trimmed}+09:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?([+-]\d{2}:\d{2}|Z)$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return DEFAULT_VIDEO_ISO_DATETIME;
};

export interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQSchema(faqs: FAQItem[], locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  const fallbackQuestion = isEnglish ? 'What is SAF Online?' : '씨앗페 온라인이란 무엇인가요?';
  const fallbackAnswer = isEnglish
    ? 'SAF Online is a campaign supporting Korean artists through artwork purchases.'
    : '씨앗페 온라인은 작품 구매를 통해 한국 예술인을 지원하는 캠페인입니다.';

  const dedupedFaqs = Array.from(
    new Map(
      faqs
        .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
        .filter((faq) => faq.question.length > 0 && faq.answer.length > 0)
        .map((faq) => [faq.question, faq])
    ).values()
  );

  const safeFaqs =
    dedupedFaqs.length > 0 ? dedupedFaqs : [{ question: fallbackQuestion, answer: fallbackAnswer }];

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: safeFaqs.map((faq, index) => ({
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
  duration?: string; // ISO 8601 (e.g. "PT5M30S")
  locale?: 'ko' | 'en';
  watchPageUrl?: string;
}

export function generateVideoSchema(video: VideoSchemaInput) {
  const contentUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`;
  const watchPageUrl = video.watchPageUrl?.trim();
  const canonicalVideoPageUrl = watchPageUrl || contentUrl;
  const normalizedUploadDate = normalizeIsoDateTime(video.uploadDate);
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': canonicalVideoPageUrl,
    url: canonicalVideoPageUrl,
    name: video.title,
    description: video.description,
    thumbnailUrl: `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`,
    uploadDate: normalizedUploadDate,
    dateModified: normalizedUploadDate,
    contentUrl,
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalVideoPageUrl,
    },
    inLanguage: video.locale === 'en' ? 'en-US' : 'ko-KR',
    ...(video.duration ? { duration: video.duration } : {}),
    transcript: video.transcript,
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: video.locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
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
  /** 기사 언어 코드 (기본 'ko') */
  locale?: 'ko' | 'en';
}

export function generateNewsArticleSchema(article: NewsArticleSchemaInput) {
  const inLanguage = article.locale === 'en' ? 'en-US' : 'ko-KR';
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
    inLanguage,
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
      name: article.locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
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

export interface BlogPostingMention {
  /** schema.org @type — 'BlogPosting'(관련 매거진), 'Product'(작품) 등 */
  type: 'BlogPosting' | 'Product' | 'Person';
  /** 표시 이름 */
  name: string;
  /** 절대 URL */
  url: string;
}

export interface BlogPostingSchemaInput {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  image: string;
  url: string;
  authorName?: string;
  locale?: 'ko' | 'en';
  /** 카테고리 라벨 (articleSection) — 예: '컬렉팅 시작하기', 'Buying Guide' */
  articleSection?: string;
  /** 카테고리 페이지 절대 URL (isPartOf로 매핑) */
  categoryUrl?: string;
  /** tags 또는 SEO 키워드 — 콤마로 join되어 keywords로 노출 */
  keywords?: readonly string[];
  /** 본문에서 인용된 관련 매거진·작품·작가 entity (mentions 필드) */
  mentions?: readonly BlogPostingMention[];
  /**
   * 글이 다루는 주제 entity. tags(매체·인물·주제 키워드)에서 추출.
   * Knowledge Graph entity 매칭 강화 — AI Overview, related searches에 직접 영향.
   */
  about?: readonly string[];
  /**
   * 본문 단어 수 — schema.org Article.wordCount. AI/Google이 콘텐츠 깊이 판단.
   * 본문 markdown에서 단순 공백 split count 추천. 0 또는 undefined면 필드 생략.
   */
  wordCount?: number;
  /**
   * 글의 교육 수준 — buying-guide는 'Beginner', art-knowledge는 'Intermediate' 등.
   * Knowledge Graph 'art education for beginners' query 매칭에 직접 영향.
   */
  educationalLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
}

export function generateBlogPostingSchema(post: BlogPostingSchemaInput) {
  const inLanguage = post.locale === 'en' ? 'en-US' : 'ko-KR';
  const orgName = post.locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME;

  const mentions = post.mentions
    ?.filter((m) => m.name && m.url)
    .map((m) => ({
      '@type': m.type,
      name: m.name,
      url: m.url,
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: post.url,
    image: [post.image],
    datePublished: post.datePublished,
    dateModified: post.dateModified ?? post.datePublished,
    inLanguage,
    author: post.authorName
      ? { '@type': 'Person', name: post.authorName }
      : { '@type': 'Organization', '@id': `${SITE_URL}#organization`, name: orgName },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: orgName,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/logo/publisher-logo.png`,
        width: 85,
        height: 60,
      },
    },
    // sourceOrganization — 편집 소스(SAF Magazine 편집부 = publisher 동일)
    sourceOrganization: { '@id': `${SITE_URL}#organization` },
    // 무료 read — 매거진 모든 글이 publicly accessible
    isAccessibleForFree: true,
    mainEntityOfPage: { '@type': 'WebPage', '@id': post.url },
    ...(post.articleSection ? { articleSection: post.articleSection } : {}),
    ...(post.categoryUrl
      ? {
          isPartOf: {
            '@type': 'Blog',
            name: post.articleSection ?? (post.locale === 'en' ? 'SAF Magazine' : '씨앗페 매거진'),
            url: post.categoryUrl,
          },
        }
      : {}),
    ...(post.keywords && post.keywords.length > 0 ? { keywords: post.keywords.join(', ') } : {}),
    ...(mentions && mentions.length > 0 ? { mentions } : {}),
    ...(post.about && post.about.length > 0
      ? { about: post.about.map((name) => ({ '@type': 'Thing', name })) }
      : {}),
    // wordCount — AI/Google 콘텐츠 깊이 시그널. 250WPM 기준 timeRequired(ISO 8601 duration) 함께 발행.
    ...(post.wordCount && post.wordCount > 0
      ? {
          wordCount: post.wordCount,
          timeRequired: `PT${Math.max(1, Math.round(post.wordCount / 250))}M`,
        }
      : {}),
    // educationalLevel — buying-guide(컬렉팅 입문) Beginner, art-knowledge Intermediate 등 매핑
    ...(post.educationalLevel ? { educationalLevel: post.educationalLevel } : {}),
  };
}

export function generateSpeakableSchema(cssSelectors: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SpeakableSpecification',
    cssSelector: cssSelectors,
  };
}
