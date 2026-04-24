import { SITE_URL, CONTACT, MERCHANT_POLICIES } from '@/lib/constants';
import { containsHangul } from '@/lib/search-utils';
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
 * 작품 상세 페이지용 작품-특화 FAQ.
 * 제목·작가·매체·크기·가격을 답변에 포함시켜 작품마다 unique한 Q&A 생성 →
 * 롱테일 검색 흡수 (예: "{작가명} 작품 가격", "{작품명} 어떤 작품", "{작품명} 크기").
 *
 * AEO/GEO (Perplexity·ChatGPT 등 LLM 인용) 및 Bing 리치 결과에 효과.
 * Google FAQ rich result은 2023년부터 정부·의료 사이트로 제한됐지만,
 * 의미 인식·발췌·LLM 인용에는 여전히 유효.
 */
export interface ArtworkSpecificFAQInput {
  id: string;
  title: string;
  title_en?: string;
  artist: string;
  artist_en?: string | null;
  material: string;
  size: string;
  year?: string;
  price: string;
  description?: string;
  description_en?: string;
  category?: string;
  sold?: boolean;
}

// material/size 등 placeholder ("확인 중", "Pending", "문의") 판별 — 답변 텍스트에서 fallback 처리
const PLACEHOLDER_VALUES = new Set(['확인 중', '확인중', 'Pending', 'pending', '문의', 'Inquiry']);
function cleanField(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed)) return null;
  return trimmed;
}

// 영문 답변 텍스트에 한국어 단어가 섞이면 generateFAQSchema의 containsHangul 가드가
// 답변 전체를 "This answer is currently available in Korean." fallback으로 대체함.
// 즉 영문 fallback 템플릿에 한국어 material/title을 끼우면 작품마다 4개 답변 중 3개가 무력화.
// → 영문 컨텍스트에서는 한국어가 섞인 필드를 null로 취급해 해당 fragment를 답변에서 제외.
function localeAwareField(value: string | null | undefined, isEn: boolean): string | null {
  const cleaned = cleanField(value);
  if (!cleaned) return null;
  if (isEn && containsHangul(cleaned)) return null;
  return cleaned;
}

export function generateArtworkSpecificFAQ(
  artwork: ArtworkSpecificFAQInput,
  locale: 'ko' | 'en' = 'ko'
): ReturnType<typeof generateFAQSchema> | null {
  const isEn = locale === 'en';
  // 영문 페이지에서 title_en/artist_en이 없으면 한국어 원본을 fallback으로 사용 → question 텍스트에
  // 한국어 박힘 → generateFAQSchema의 containsHangul 가드가 question name을 "FAQ N"으로 통째 대체.
  // 작품마다 4개 질문이 모두 "FAQ 1~4"가 되어 schema 데이터로 무의미해지므로 이 경우 schema 자체를 skip.
  // (/en/은 어차피 noindex라 SEO 손실 없음, ko 페이지는 이 가드 미적용으로 정상 동작.)
  if (isEn && (!artwork.title_en?.trim() || !artwork.artist_en?.trim())) {
    return null;
  }
  const title = isEn && artwork.title_en ? artwork.title_en : artwork.title;
  const artistName = isEn && artwork.artist_en ? artwork.artist_en : artwork.artist;
  const description = isEn && artwork.description_en ? artwork.description_en : artwork.description;
  // 작가 페이지 URL은 항상 ko URL — /en/은 noindex 정책이라 sitemap에도 미포함되어 영문 경로를
  // JSON-LD에 박으면 LLM·검색엔진이 색인 안 된 deadlink로 인용함.
  const artistUrl = `${SITE_URL}/artworks/artist/${encodeURIComponent(artwork.artist)}`;

  // placeholder 제거 + 영문에서는 한국어 섞인 값 제거.
  // 한국어 답변에서는 한국어 material("유화" 등)이 자연스러우므로 cleanField만 적용.
  const material = isEn ? localeAwareField(artwork.material, true) : cleanField(artwork.material);
  const size = isEn ? localeAwareField(artwork.size, true) : cleanField(artwork.size);
  const price = isEn ? localeAwareField(artwork.price, true) : cleanField(artwork.price);
  const year = cleanField(artwork.year);

  const availabilityNote = artwork.sold
    ? isEn
      ? ' This work has already been sold; explore other works by the artist.'
      : ' 이 작품은 판매가 완료되었습니다. 같은 작가의 다른 작품을 둘러보세요.'
    : '';

  // Q2 question은 "가격과 크기"를 고정으로 묻기 때문에 price/size 중 하나라도 있어야 답변과 일치.
  // material만 있는 경우 Q2를 포함하면 "매체는 X입니다." 답변이 question("가격과 크기")과 mismatch.
  // → material은 이미 Q1 fallback(description 없을 때)과 Q4 cert 답변에 항상 노출되므로 정보 손실 없음.
  const hasPriceOrSize = Boolean(price || size);

  // 답변 fragment를 모두 "완결된 한 문장"으로 만들어서 join — 끊긴 쉼표 방지.
  // ko: "가격은 X입니다." "크기는 Y입니다." "매체는 Z, 2024년 작입니다."
  // en: "Price: X." "Size: Y." "Medium: Z, made in 2024."
  const priceSizeAnswerKo = [
    price ? `가격은 ${price}입니다.` : null,
    size ? `크기는 ${size}입니다.` : null,
    material ? `매체는 ${material}${year ? `, ${year}년 작` : ''}입니다.` : null,
  ]
    .filter(Boolean)
    .join(' ');
  const priceSizeAnswerEn = [
    price ? `Price: ${price}.` : null,
    size ? `Size: ${size}.` : null,
    material ? `Medium: ${material}${year ? `, made in ${year}` : ''}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  // 첫 번째 Q (어떤 작품인지) fallback 텍스트 — material 있으면 끼움, 없으면 생략.
  const firstAnswerKoFallback = material
    ? `"${title}"은 ${artistName} 작가의 ${material} 원본 작품으로, 한국 예술인 상호부조 캠페인 씨앗페 2026에 출품되었습니다.`
    : `"${title}"은 ${artistName} 작가의 원본 작품으로, 한국 예술인 상호부조 캠페인 씨앗페 2026에 출품되었습니다.`;
  const firstAnswerEnFallback = material
    ? `"${title}" is an original ${material} work by ${artistName}, presented at SAF 2026 — a mutual-aid campaign by Korean artists.`
    : `"${title}" is an original work by ${artistName}, presented at SAF 2026 — a mutual-aid campaign by Korean artists.`;

  // 보증서 답변
  const certAnswerEn = material
    ? `Yes. "${title}" is an original ${material} work by ${artistName}, verified through SAF 2026. A certificate of authenticity is provided where applicable.`
    : `Yes. "${title}" is an original work by ${artistName}, verified through SAF 2026. A certificate of authenticity is provided where applicable.`;
  const certAnswerKo = material
    ? `네. "${title}"은 ${artistName} 작가의 ${material} 원본 작품이며, 씨앗페 2026 검증을 거쳤습니다. 해당 작품에는 정품 보증서가 함께 제공됩니다.`
    : `네. "${title}"은 ${artistName} 작가의 원본 작품이며, 씨앗페 2026 검증을 거쳤습니다. 해당 작품에는 정품 보증서가 함께 제공됩니다.`;

  const faqs = isEn
    ? [
        {
          question: `What kind of work is "${title}" by ${artistName}?`,
          answer: (description?.trim() || firstAnswerEnFallback) + availabilityNote,
        },
        ...(hasPriceOrSize
          ? [
              {
                question: `What is the price and size of "${title}"?`,
                answer: priceSizeAnswerEn,
              },
            ]
          : []),
        {
          question: `Can I see other works by ${artistName}?`,
          answer: `Yes. View ${artistName}'s full SAF 2026 collection at ${artistUrl}.`,
        },
        {
          question: `Is "${title}" an original work with a certificate of authenticity?`,
          answer: certAnswerEn,
        },
      ]
    : [
        {
          question: `${artistName} 작가의 "${title}"은 어떤 작품인가요?`,
          answer: (description?.trim() || firstAnswerKoFallback) + availabilityNote,
        },
        ...(hasPriceOrSize
          ? [
              {
                question: `"${title}"의 가격과 크기는 어떻게 되나요?`,
                answer: priceSizeAnswerKo,
              },
            ]
          : []),
        {
          question: `${artistName} 작가의 다른 작품도 볼 수 있나요?`,
          answer: `네. ${artistName} 작가가 씨앗페 2026에 출품한 모든 작품을 ${artistUrl} 에서 확인하실 수 있습니다.`,
        },
        {
          question: `"${title}"은 원본 작품이며 진품 보증서가 제공되나요?`,
          answer: certAnswerKo,
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
