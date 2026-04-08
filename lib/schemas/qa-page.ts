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
export function generateQAPageSchema(items: QAItem[], pageUrl: string, locale: 'ko' | 'en' = 'ko') {
  const orgName = locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME;
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
          '@id': `${SITE_URL}#organization`,
          name: orgName,
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
          question: 'What is SAF (Seed Art Festival) Online?',
          answer: `SAF Online is a special art exhibition organized by ${CONTACT.ORGANIZATION_NAME_EN} to raise mutual-aid funds for Korean artists facing financial exclusion. Over 110 artists voluntarily contributed their works, and proceeds from sales go to a low-interest loan fund for artists in financial distress.`,
          url: `${SITE_URL}/en`,
        },
        {
          question: 'Why do Korean artists need a mutual-aid fund?',
          answer:
            '84.9% of Korean artists are excluded from primary banking services due to irregular, project-based income. Without access to fair finance, 48.6% are exposed to predatory lending (APR 15%+), and 88.3% of those who experience debt collection stop creating art entirely. The mutual-aid fund provides low-interest bridge loans during income gaps.',
          url: `${SITE_URL}/en/our-reality`,
        },
        {
          question: 'How can I support SAF Online?',
          answer:
            'You can support SAF Online in two ways: (1) Purchase artwork from the online gallery — proceeds fund the mutual-aid program, or (2) Join as a cooperative member to provide ongoing support. Visit saf2026.com for details.',
          url: `${SITE_URL}/en/artworks`,
        },
        {
          question: 'What is the repayment rate of the SAF mutual-aid loan?',
          answer:
            'The SAF mutual-aid loan has a 95% repayment rate, based on 354 cumulative loans issued between December 2022 and September 2025. This demonstrates that artists are reliable borrowers when given fair financial terms.',
          url: `${SITE_URL}/en/our-reality`,
        },
        {
          question: 'How do I purchase artwork from SAF Online?',
          answer: `Browse the online gallery at saf2026.com/en/artworks, select the artwork you want, and click the purchase button to complete the order via the secure Cafe24 shop. Domestic shipping within Korea is free. Payments are processed through the official ${CONTACT.ORGANIZATION_NAME_EN} shop.`,
          url: `${SITE_URL}/en/artworks`,
        },
        {
          question: 'What is the shipping and return policy for SAF Online artworks?',
          answer:
            'Domestic shipping within Korea is free of charge. Orders are typically dispatched within 1–2 business days and delivered within 3–5 business days. Returns are accepted within 7 days of delivery for unused items in original condition. Contact contact@kosmart.org for return requests.',
          url: `${SITE_URL}/en/artworks`,
        },
        {
          question: 'What is the price range of artworks at SAF Online?',
          answer:
            'Artwork prices at SAF Online range from affordable prints to unique original paintings. Most original paintings are priced between KRW 300,000 and KRW 5,000,000. Visit the gallery to see current pricing for all 127 works across painting, printmaking, photography, and sculpture.',
          url: `${SITE_URL}/en/artworks`,
        },
        {
          question: 'When is the SAF 2026 exhibition?',
          answer:
            'The SAF 2026 offline exhibition ran from January 14 to January 26, 2026, at Insa Art Center 3F G&J Gallery in Insadong, Seoul. The online exhibition remains open year-round at saf2026.com.',
          url: `${SITE_URL}/en/archive/2026`,
        },
        {
          question: 'Where can I find the SAF exhibition catalog?',
          answer:
            'The SAF Online Gallery at saf2026.com/en/artworks serves as the digital exhibition catalog. Browse all 127 artworks by 127 artists across painting, printmaking, photography, and sculpture. The 2026 offline exhibition archive with poster and visitor reviews is also available.',
          url: `${SITE_URL}/en/artworks`,
        },
      ]
    : [
        {
          question: '씨앗페(SAF) 온라인이란 무엇인가요?',
          answer: `씨앗페 온라인은 ${CONTACT.ORGANIZATION_NAME}이 주최하는 예술인 상호부조 기금 마련 특별전입니다. 110여 명의 작가가 자발적으로 작품을 출품했으며, 판매 수익금은 금융 위기에 처한 예술인에게 저금리 대출로 전달됩니다.`,
          url: SITE_URL,
        },
        {
          question: '왜 예술인에게 상호부조 기금이 필요한가요?',
          answer:
            '한국 예술인의 84.9%가 제1금융권에서 배제되어 있습니다. 불규칙한 프로젝트 기반 소득으로 인해 은행 대출이 거절되고, 48.6%는 연 15% 이상의 고리대금에 노출됩니다. 채권추심을 경험한 예술인의 88.3%가 창작 활동을 중단합니다. 상호부조 기금은 소득 공백기에 저금리 긴급 대출을 제공합니다.',
          url: `${SITE_URL}/our-reality`,
        },
        {
          question: '씨앗페 온라인을 어떻게 지원할 수 있나요?',
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
        {
          question: '씨앗페 온라인에서 작품을 어떻게 구매하나요?',
          answer: `saf2026.com/artworks에서 원하는 작품을 선택한 후 구매 버튼을 클릭하면 ${CONTACT.ORGANIZATION_NAME} 공식 카페24 쇼핑몰로 연결됩니다. 국내 배송비는 무료이며, 안전결제를 통해 주문이 완료됩니다.`,
          url: `${SITE_URL}/artworks`,
        },
        {
          question: '씨앗페 온라인 작품의 배송 및 반품 정책은 어떻게 되나요?',
          answer:
            '국내 배송비는 무료입니다. 주문 후 1~2 영업일 내 발송되며, 3~5 영업일 내 수령 가능합니다. 수령 후 7일 이내 미사용·원상태의 제품은 반품 가능합니다. 반품 신청은 contact@kosmart.org로 문의하세요.',
          url: `${SITE_URL}/artworks`,
        },
        {
          question: '씨앗페 온라인 작품 가격대는 어떻게 되나요?',
          answer:
            '씨앗페 온라인 작품 가격은 판화·사진 등 소형 작품부터 대형 회화까지 다양합니다. 대부분의 작품은 30만 원에서 500만 원 사이에 형성되어 있으며, 회화·판화·사진·조각 등 127점의 작품이 출품되어 있습니다.',
          url: `${SITE_URL}/artworks`,
        },
        {
          question: '씨앗페 전시회 일정은 언제인가요?',
          answer:
            '씨앗페(SAF) 2026 오프라인 전시는 2026년 1월 14일부터 1월 26일까지 서울 종로구 인사아트센터 3층 G&J 갤러리에서 12일간 열렸습니다. 오프라인 전시는 종료되었으나, 온라인 전시는 saf2026.com에서 상설 운영 중입니다.',
          url: `${SITE_URL}/archive/2026`,
        },
        {
          question: '씨앗페 전시 도록은 어디서 볼 수 있나요?',
          answer:
            '씨앗페 온라인 갤러리(saf2026.com/artworks)가 디지털 전시 도록 역할을 합니다. 127명 작가의 127점 작품 전체를 온라인에서 확인·구매하실 수 있으며, 아카이브 페이지(saf2026.com/archive/2026)에서는 오프라인 전시 기록과 포스터도 제공됩니다.',
          url: `${SITE_URL}/artworks`,
        },
        {
          question: '씨앗페 전시회 포스터는 어디서 확인할 수 있나요?',
          answer:
            '씨앗페 2026 전시회 포스터와 오프라인 전시 현장 사진은 아카이브 페이지(saf2026.com/archive/2026)에서 확인하실 수 있습니다. 전시 기록, 관람객 후기, 작품 목록도 함께 제공됩니다.',
          url: `${SITE_URL}/archive/2026`,
        },
        {
          question: '전시회를 영어로 어떻게 표현하나요?',
          answer:
            '전시회는 영어로 "Exhibition" 또는 "Art Exhibition"이라고 합니다. 씨앗페(SAF, Seed Art Festival)는 한국 현대미술 전시회(Korean Contemporary Art Exhibition)로, 영문 페이지(saf2026.com/en)에서 영어로도 이용하실 수 있습니다.',
          url: `${SITE_URL}/en`,
        },
      ];

  return generateQAPageSchema(items, pageUrl, locale);
}
