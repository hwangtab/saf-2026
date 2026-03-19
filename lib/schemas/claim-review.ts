import { SITE_URL, CONTACT } from '@/lib/constants';

export interface ClaimReviewInput {
  /** The claim being reviewed (e.g., "84.9% of Korean artists are excluded from primary banking") */
  claimText: string;
  /** URL where the claim appears */
  url: string;
  /** Rating: 1 (false) to 5 (true). Use 5 for verified data */
  truthRating: 1 | 2 | 3 | 4 | 5;
  /** Human-readable rating label */
  ratingLabel: string;
  /** Source description for the claim evidence */
  evidenceSource: string;
  /** Date the review was published (ISO format) */
  datePublished: string;
}

const RATING_LABELS: Record<number, string> = {
  1: 'False',
  2: 'Mostly False',
  3: 'Half True',
  4: 'Mostly True',
  5: 'True',
};

/**
 * Generate ClaimReview schema for statistical claims.
 * Helps AI engines trust and cite specific data points from the site.
 *
 * @see https://schema.org/ClaimReview
 */
export function generateClaimReviewSchema(input: ClaimReviewInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    url: input.url,
    datePublished: input.datePublished,
    claimReviewed: input.claimText,
    author: {
      '@type': 'Organization',
      name: CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: input.truthRating,
      bestRating: 5,
      worstRating: 1,
      alternateName: input.ratingLabel || RATING_LABELS[input.truthRating],
    },
    itemReviewed: {
      '@type': 'Claim',
      name: input.claimText,
      appearance: {
        '@type': 'CreativeWork',
        name: input.evidenceSource,
        url: input.url,
      },
    },
  };
}

/**
 * Pre-configured ClaimReview schemas for SAF's key statistical claims.
 * These claims are sourced from the 2025 Artist Financial Disaster Report.
 */
export function generateSAFClaimReviews(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  const ourRealityUrl = isEnglish ? `${SITE_URL}/en/our-reality` : `${SITE_URL}/our-reality`;

  const claims: ClaimReviewInput[] = [
    {
      claimText: isEnglish
        ? '84.9% of Korean artists are excluded from primary banking services'
        : '한국 예술인의 84.9%가 제1금융권에서 배제되어 있다',
      url: ourRealityUrl,
      truthRating: 5,
      ratingLabel: isEnglish ? 'Verified by survey data' : '설문 데이터로 검증됨',
      evidenceSource: isEnglish
        ? '2025 Artist Financial Disaster Report (Korea Smart Cooperative, n=179)'
        : '2025 예술인 금융 재난 보고서 (한국스마트협동조합, n=179)',
      datePublished: '2025-11-05',
    },
    {
      claimText: isEnglish
        ? '48.6% of Korean artists are exposed to predatory lending products (APR 15%+)'
        : '한국 예술인의 48.6%가 고리대금 상품(연 15% 이상)에 노출되어 있다',
      url: ourRealityUrl,
      truthRating: 5,
      ratingLabel: isEnglish ? 'Verified by survey data' : '설문 데이터로 검증됨',
      evidenceSource: isEnglish
        ? '2025 Artist Financial Disaster Report (Korea Smart Cooperative, n=179)'
        : '2025 예술인 금융 재난 보고서 (한국스마트협동조합, n=179)',
      datePublished: '2025-11-05',
    },
    {
      claimText: isEnglish
        ? '88.3% of artists who experienced debt collection stopped creating art'
        : '채권추심 경험 예술인의 88.3%가 창작 활동을 중단했다',
      url: ourRealityUrl,
      truthRating: 5,
      ratingLabel: isEnglish ? 'Verified by survey data' : '설문 데이터로 검증됨',
      evidenceSource: isEnglish
        ? '2025 Artist Financial Disaster Report (Korea Smart Cooperative, n=179)'
        : '2025 예술인 금융 재난 보고서 (한국스마트협동조합, n=179)',
      datePublished: '2025-11-05',
    },
    {
      claimText: isEnglish
        ? 'The SAF mutual-aid loan repayment rate is 95%'
        : '씨앗페 상호부조 대출 상환율은 95%이다',
      url: ourRealityUrl,
      truthRating: 5,
      ratingLabel: isEnglish ? 'Verified by operational records' : '운용 기록으로 검증됨',
      evidenceSource: isEnglish
        ? 'Artist Mutual Aid Loan Operations Record (Dec 2022 - Sep 2025, 354 cumulative loans)'
        : '예술인 상호부조 대출 운용 기록 (2022.12 ~ 2025.09, 누적 354건)',
      datePublished: '2025-11-05',
    },
  ];

  return claims.map(generateClaimReviewSchema);
}
