import { SITE_URL, CONTACT } from '@/lib/constants';

export interface QAItem {
  question: string;
  answer: string;
  url?: string;
}

/**
 * Generate QAPage schema for question-answer content.
 * Unlike FAQPage (which is for a list of FAQs), QAPage is for
 * individual questions with community/authoritative answers.
 * Better suited for AEO as AI engines parse individual Q&A pairs.
 *
 * @see https://schema.org/QAPage
 */
export function generateQAPageSchema(items: QAItem[], pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      answerCount: 1,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
        url: item.url || pageUrl,
        author: {
          '@type': 'Organization',
          name: CONTACT.ORGANIZATION_NAME,
          url: SITE_URL,
        },
      },
    })),
  };
}

/**
 * Pre-configured Q&A items for SAF 2026 — core questions
 * that AI engines should be able to answer about the campaign.
 */
export function generateSAFCoreQA(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  const pageUrl = isEnglish ? `${SITE_URL}/en` : SITE_URL;

  const items: QAItem[] = isEnglish
    ? [
        {
          question: 'What is SAF (Seed Art Festival) 2026?',
          answer:
            'SAF 2026 is a special art exhibition organized by the Korea Smart Cooperative to raise mutual-aid funds for Korean artists facing financial exclusion. Over 110 artists voluntarily contributed their works, and proceeds from sales go to a low-interest loan fund for artists in financial distress.',
          url: `${SITE_URL}/en`,
        },
        {
          question: 'Why do Korean artists need a mutual-aid fund?',
          answer:
            '84.9% of Korean artists are excluded from primary banking services due to irregular, project-based income. Without access to fair finance, 48.6% are exposed to predatory lending (APR 15%+), and 88.3% of those who experience debt collection stop creating art entirely. The mutual-aid fund provides low-interest bridge loans during income gaps.',
          url: `${SITE_URL}/en/our-reality`,
        },
        {
          question: 'How can I support SAF 2026?',
          answer:
            'You can support SAF 2026 in two ways: (1) Purchase artwork from the online gallery — proceeds fund the mutual-aid program, or (2) Join as a cooperative member to provide ongoing support. Visit saf2026.com for details.',
          url: `${SITE_URL}/en/artworks`,
        },
        {
          question: 'What is the repayment rate of the SAF mutual-aid loan?',
          answer:
            'The SAF mutual-aid loan has a 95% repayment rate, based on 354 cumulative loans issued between December 2022 and September 2025. This demonstrates that artists are reliable borrowers when given fair financial terms.',
          url: `${SITE_URL}/en/our-reality`,
        },
      ]
    : [
        {
          question: '씨앗페(SAF) 2026이란 무엇인가요?',
          answer:
            '씨앗페 2026은 한국스마트협동조합이 주최하는 예술인 상호부조 기금 마련 특별전입니다. 110여 명의 작가가 자발적으로 작품을 출품했으며, 판매 수익금은 금융 위기에 처한 예술인에게 저금리 대출로 전달됩니다.',
          url: SITE_URL,
        },
        {
          question: '왜 예술인에게 상호부조 기금이 필요한가요?',
          answer:
            '한국 예술인의 84.9%가 제1금융권에서 배제되어 있습니다. 불규칙한 프로젝트 기반 소득으로 인해 은행 대출이 거절되고, 48.6%는 연 15% 이상의 고리대금에 노출됩니다. 채권추심을 경험한 예술인의 88.3%가 창작 활동을 중단합니다. 상호부조 기금은 소득 공백기에 저금리 긴급 대출을 제공합니다.',
          url: `${SITE_URL}/our-reality`,
        },
        {
          question: '씨앗페 2026을 어떻게 지원할 수 있나요?',
          answer:
            '두 가지 방법이 있습니다: (1) 온라인 갤러리에서 작품 구매 — 수익금이 상호부조 기금으로 사용됩니다. (2) 조합원 가입 — 지속적인 기금 지원에 참여합니다. saf2026.com에서 자세한 내용을 확인하세요.',
          url: `${SITE_URL}/artworks`,
        },
        {
          question: '씨앗페 상호부조 대출의 상환율은 얼마인가요?',
          answer:
            '씨앗페 상호부조 대출의 상환율은 95%입니다. 이는 2022년 12월부터 2025년 9월까지 누적 354건의 대출 운용 기록에 기반합니다. 공정한 금융 조건이 제공되면 예술인도 신뢰할 수 있는 대출자임을 증명합니다.',
          url: `${SITE_URL}/our-reality`,
        },
      ];

  return generateQAPageSchema(items, pageUrl);
}
