import { SITE_URL, CONTACT } from '@/lib/constants';

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
            text: 'Click the purchase button to be redirected to the official shop page on Cafe24.',
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
            text: '구매하기 버튼을 클릭하면 공식 판매 페이지(Cafe24)로 이동합니다.',
          },
          {
            name: '결제 완료',
            text: '결제 절차를 진행하여 구매를 완료합니다. 국내 배송은 영업일 기준 1-7일 소요됩니다.',
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
      ? 'How to Join the Korea Smart Cooperative as a Member'
      : '한국스마트협동조합 조합원 가입 방법',
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
            text: `You will receive a confirmation email from ${CONTACT.ORGANIZATION_NAME} within a few business days.`,
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
