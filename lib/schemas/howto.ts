import { SITE_URL, CONTACT, MERCHANT_POLICIES } from '@/lib/constants';
import { generateFAQSchema } from './content';

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

export interface HowToInput {
  name: string;
  description: string;
  totalTime?: string; // ISO 8601 duration (e.g., "PT10M")
  estimatedCost?: { currency: string; value: string };
  steps: HowToStep[];
  url?: string;
}

/**
 * Generate HowTo schema for step-by-step guides.
 * Helps Google and AI engines display rich how-to snippets.
 *
 * @see https://schema.org/HowTo
 */
export function generateHowToSchema(input: HowToInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    ...(input.totalTime && { totalTime: input.totalTime }),
    ...(input.estimatedCost && {
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: input.estimatedCost.currency,
        value: input.estimatedCost.value,
      },
    }),
    ...(input.url && { url: input.url }),
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.url && { url: step.url }),
      ...(step.image && { image: step.image }),
    })),
  };
}

/**
 * Pre-configured HowTo: How to purchase artwork at SAF 2026
 */
export function generateArtworkPurchaseHowTo(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';

  return generateHowToSchema({
    name: isEnglish ? 'How to Purchase Artwork at SAF Online' : 'SAF Online에서 작품 구매하는 방법',
    description: isEnglish
      ? 'A step-by-step guide to purchasing artwork from the Seed Art Festival Online. Your purchase supports the artist mutual-aid fund.'
      : '씨앗페 온라인 작품 구매 가이드. 작품 구매 수익금은 예술인 상호부조 기금으로 사용됩니다.',
    totalTime: 'PT10M',
    url: isEnglish ? `${SITE_URL}/en/artworks` : `${SITE_URL}/artworks`,
    steps: isEnglish
      ? [
          {
            name: 'Browse the artwork gallery',
            text: 'Visit the SAF Online artworks page to explore paintings, sculptures, photography, and more by over 110 participating artists.',
            url: `${SITE_URL}/en/artworks`,
          },
          {
            name: 'Select an artwork',
            text: 'Click on an artwork to view details including medium, size, price, and artist profile.',
          },
          {
            name: 'Click "Purchase" to visit the shop',
            text: 'Click the purchase button to proceed to checkout via Toss Payments.',
          },
          {
            name: 'Complete the purchase',
            text: 'Follow the checkout process to complete your purchase. Shipping within Korea typically takes 1-7 business days.',
          },
        ]
      : [
          {
            name: '작품 갤러리 둘러보기',
            text: '씨앗페 온라인 출품작 페이지에서 110여 명의 참여 작가가 출품한 회화, 조각, 사진 등 다양한 작품을 탐색합니다.',
            url: `${SITE_URL}/artworks`,
          },
          {
            name: '작품 선택',
            text: '마음에 드는 작품을 클릭하여 재료, 크기, 가격, 작가 프로필 등 상세 정보를 확인합니다.',
          },
          {
            name: '"구매하기" 버튼 클릭',
            text: '구매하기 버튼을 클릭하면 토스페이먼츠 결제 페이지로 이동합니다.',
          },
          {
            name: '결제 완료',
            text: '결제 절차를 진행하여 구매를 완료합니다. 국내 배송은 영업일 기준 1-7일 소요됩니다.',
          },
        ],
  });
}

/**
 * 구매 관련 FAQ 스키마 — FAQPage 형식
 * artworks 목록/카테고리 페이지에서 "사람들이 자주 묻는 질문" 리치 결과 대응
 */
export function generateArtworkPurchaseFAQ(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  const shipping = MERCHANT_POLICIES.SHIPPING;

  const faqs = isEnglish
    ? [
        {
          question: 'How do I purchase an artwork on SAF Online?',
          answer: `Browse artworks at ${SITE_URL}/en/artworks, click on the artwork you like, then click the "Buy Now" button to proceed to checkout via Toss Payments.`,
        },
        {
          question: 'How much is shipping?',
          answer: `Shipping within Korea is a flat rate of ₩${shipping.rate.toLocaleString('ko-KR')}. International shipping is not currently available.`,
        },
        {
          question: 'Can I return an artwork?',
          answer: `Yes. Returns are accepted within ${MERCHANT_POLICIES.RETURN.merchantReturnDays} days of delivery. Return shipping costs are the responsibility of the buyer. Contact us at ${CONTACT.EMAIL} to initiate a return.`,
        },
        {
          question: 'How long does delivery take?',
          answer: `Order processing takes ${shipping.handlingDays.min}–${shipping.handlingDays.max} business days, and delivery within Korea takes ${shipping.transitDays.min}–${shipping.transitDays.max} business days.`,
        },
        {
          question: 'Are the artworks original works?',
          answer:
            'Yes. All artworks are original works by verified Korean artists participating in the SAF 2026 exhibition. Certificates of authenticity are provided where applicable.',
        },
        {
          question: 'What is the purpose of artwork sales revenue?',
          answer: `All proceeds are donated to the ${CONTACT.ORGANIZATION_NAME_EN} artist mutual-aid fund, which provides low-interest loans to Korean artists facing financial discrimination.`,
        },
      ]
    : [
        {
          question: '씨앗페 온라인에서 작품을 어떻게 구매하나요?',
          answer: `${SITE_URL}/artworks 에서 마음에 드는 작품을 클릭한 후 "온라인 구매" 버튼을 누르면 토스페이먼츠 결제 페이지로 이동합니다. 회원가입 없이 구매 가능합니다.`,
        },
        {
          question: '배송비는 얼마인가요?',
          answer: `배송비는 전국 단일 요금 ₩${shipping.rate.toLocaleString('ko-KR')}이며, 현재 국내 배송만 가능합니다.`,
        },
        {
          question: '반품이나 교환이 가능한가요?',
          answer: `네. 작품 수령 후 ${MERCHANT_POLICIES.RETURN.merchantReturnDays}일 이내에 반품 신청이 가능합니다. 반품 배송비는 구매자 부담이며, ${CONTACT.EMAIL} 또는 ${CONTACT.PHONE}으로 연락해 주세요.`,
        },
        {
          question: '배송은 얼마나 걸리나요?',
          answer: `주문 처리에 ${shipping.handlingDays.min}~${shipping.handlingDays.max}일, 국내 배송에 ${shipping.transitDays.min}~${shipping.transitDays.max}일이 소요됩니다.`,
        },
        {
          question: '작품이 진품인가요?',
          answer:
            '네. 씨앗페 2026 전시에 참여한 인증된 한국 작가들의 원본 작품입니다. 해당 작품에는 정품 보증서가 함께 제공됩니다.',
        },
        {
          question: '작품 판매 수익금은 어디에 쓰이나요?',
          answer: `수익금 전액은 ${CONTACT.ORGANIZATION_NAME}의 예술인 상호부조 기금으로 귀속되어, 금융 차별을 겪는 예술인에게 저금리 대출로 지원됩니다.`,
        },
      ];

  return generateFAQSchema(faqs, locale);
}

/**
 * Pre-configured HowTo: How to enjoy the SAF Online Exhibition
 * Targets "전시회를 즐기다", "전시회를 즐기는 방법" search intent.
 */
export function generateExhibitionEnjoyHowTo(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';

  return generateHowToSchema({
    name: isEnglish
      ? 'How to Enjoy the SAF Online Exhibition'
      : '씨앗페 온라인 전시회를 즐기는 방법',
    description: isEnglish
      ? 'A guide to getting the most out of the SAF Online Gallery — from discovering artworks to learning about artists and supporting the mutual-aid fund.'
      : '씨앗페 온라인 전시를 200% 즐기는 방법. 작품 탐색부터 작가 인터뷰, 전시 도록 감상, 작품 구매까지 단계별 안내.',
    totalTime: 'PT20M',
    url: isEnglish ? `${SITE_URL}/en` : SITE_URL,
    steps: isEnglish
      ? [
          {
            name: 'Browse the exhibition gallery',
            text: 'Visit the online gallery at saf2026.com/en/artworks to explore 127 works across painting, printmaking, photography, and sculpture by 127 Korean artists.',
            url: `${SITE_URL}/en/artworks`,
          },
          {
            name: 'Read artist stories',
            text: 'Discover the stories behind the artworks in the Magazine section — artist interviews, collecting guides, and art knowledge articles.',
            url: `${SITE_URL}/en/stories`,
          },
          {
            name: 'Explore the exhibition archive',
            text: 'View the exhibition poster, on-site photos, and visitor reviews from the 2026 offline exhibition held at Insa Art Center, Seoul.',
            url: `${SITE_URL}/en/archive/2026`,
          },
          {
            name: 'Purchase your favorite artwork',
            text: 'Support Korean artists by purchasing a work. All proceeds fund low-interest mutual-aid loans for artists facing financial exclusion.',
            url: `${SITE_URL}/en/artworks`,
          },
        ]
      : [
          {
            name: '전시 갤러리 탐색',
            text: '온라인 갤러리(saf2026.com/artworks)에서 127명 작가의 회화·판화·사진·조각 127점을 카테고리별·가격별로 둘러보세요.',
            url: `${SITE_URL}/artworks`,
          },
          {
            name: '작가 이야기 읽기',
            text: '매거진에서 작가 인터뷰, 컬렉팅 가이드, 미술 상식을 읽으며 작품을 더 깊이 이해하세요.',
            url: `${SITE_URL}/stories`,
          },
          {
            name: '전시 아카이브·도록 감상',
            text: '2026년 서울 인사아트센터 오프라인 전시의 포스터, 현장 사진, 관람객 후기를 아카이브에서 확인하세요.',
            url: `${SITE_URL}/archive/2026`,
          },
          {
            name: '마음에 드는 작품 구매',
            text: '작품 구매 수익금은 예술인 상호부조 기금이 되어 금융 차별을 겪는 예술인에게 저금리 대출로 전달됩니다.',
            url: `${SITE_URL}/artworks`,
          },
        ],
  });
}

/**
 * Pre-configured HowTo: How to join as a cooperative member
 */
export function generateMemberJoinHowTo(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';

  return generateHowToSchema({
    name: isEnglish
      ? `How to Join ${CONTACT.ORGANIZATION_NAME_EN} as a Member`
      : `${CONTACT.ORGANIZATION_NAME} 조합원 가입 방법`,
    description: isEnglish
      ? 'Join as a cooperative member to support the artist mutual-aid fund. Members receive regular updates and can participate in governance.'
      : '조합원 가입으로 예술인 상호부조 기금을 지원하세요. 조합원에게는 정기 소식과 운영 참여 기회가 제공됩니다.',
    totalTime: 'PT5M',
    url: SITE_URL,
    steps: isEnglish
      ? [
          {
            name: 'Visit the membership page',
            text: 'Click the "Join as a member" button on the SAF Online website.',
          },
          {
            name: 'Fill out the application form',
            text: 'Complete the Microsoft Forms application with your name, contact details, and membership type.',
          },
          {
            name: 'Submit and await confirmation',
            text: `You will receive a confirmation email from ${CONTACT.ORGANIZATION_NAME_EN} within a few business days.`,
          },
        ]
      : [
          {
            name: '가입 페이지 방문',
            text: '씨앗페 온라인 웹사이트에서 "조합원 가입" 버튼을 클릭합니다.',
          },
          {
            name: '신청서 작성',
            text: 'Microsoft Forms 신청서에 이름, 연락처, 가입 유형 등을 기입합니다.',
          },
          {
            name: '제출 및 승인 대기',
            text: `${CONTACT.ORGANIZATION_NAME}에서 영업일 기준 수일 내에 확인 이메일을 보내드립니다.`,
          },
        ],
  });
}
