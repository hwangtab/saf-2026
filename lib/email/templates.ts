import type { BroadcastChannel } from '@/lib/email/audiences/types';

export interface BroadcastTemplate {
  id: string;
  label: string;
  description: string;
  channel: BroadcastChannel;
  isAdvertisement: boolean;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

function body(text: string): { bodyHtml: string; bodyText: string } {
  const bodyText = text.trim();
  return {
    bodyText,
    bodyHtml: bodyText
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join(''),
  };
}

// 브랜드 톤: 출품 작가는 "동료 예술인을 돕는 연대자"이지 불우한 대상이 아님.
// 본문은 빈 줄로 문단 구분, {{name}}은 수신자 이름으로 치환됨.
export const BROADCAST_TEMPLATES: BroadcastTemplate[] = [
  // ── 작가·출품자 (member) ──
  {
    id: 'member-exhibition-schedule',
    label: '전시 일정·준비 안내',
    description: '참여 작가에게 전시 일정과 준비 사항 공지',
    channel: 'member',
    isAdvertisement: false,
    subject: '씨앗페 2026 전시 일정 및 준비 안내',
    ...body(
      '{{name}}님, 함께해 주셔서 감사합니다.\n\n씨앗페 2026 전시 일정과 준비 사항을 안내드립니다. 아래 일정을 확인해 주세요.\n\n문의 사항은 회신해 주시면 빠르게 도와드리겠습니다.'
    ),
    ctaLabel: '전시 안내 보기',
    ctaUrl: 'https://www.saf2026.com',
  },
  {
    id: 'member-settlement',
    label: '출품·정산 안내',
    description: '작품 판매·정산 관련 안내',
    channel: 'member',
    isAdvertisement: false,
    subject: '작품 판매 및 정산 안내',
    ...body(
      '{{name}}님께 작품 판매 및 정산 관련 내용을 안내드립니다.\n\n자세한 내역은 아래에서 확인할 수 있습니다. 확인 후 궁금하신 점은 언제든 회신 주세요.'
    ),
  },
  {
    id: 'member-thanks',
    label: '참여 작가 감사',
    description: '연대에 함께해 준 작가에게 감사 인사',
    channel: 'member',
    isAdvertisement: false,
    subject: '함께해 주셔서 감사합니다',
    ...body(
      '{{name}}님, 동료 예술인을 위해 작품을 내어주신 그 마음에 깊이 감사드립니다.\n\n여러분의 연대가 금융 차별을 겪는 예술인에게 실질적인 회복의 길을 열고 있습니다.'
    ),
  },
  // ── 고객 마케팅 (customer, 광고) ──
  {
    id: 'customer-new-artwork',
    label: '신작 입고 안내',
    description: '새로 등록된 작품 소개 (광고)',
    channel: 'customer',
    isAdvertisement: true,
    subject: '새로운 작품이 도착했습니다',
    ...body(
      '{{name}}님, 씨앗페에 새로운 작품이 등록되었습니다.\n\n작품을 구매하시면 그 수익이 동료 예술인을 위한 상호부조 기금이 되어, 금융 차별을 겪는 예술인에게 저금리 대출로 이어집니다.'
    ),
    ctaLabel: '신작 보러 가기',
    ctaUrl: 'https://www.saf2026.com/artworks',
  },
  {
    id: 'customer-exhibition-invite',
    label: '전시 초대',
    description: '전시·행사 초대 (광고)',
    channel: 'customer',
    isAdvertisement: true,
    subject: '씨앗페 2026 전시에 초대합니다',
    ...body(
      '{{name}}님을 씨앗페 2026 전시에 초대합니다.\n\n예술가들의 연대로 만들어진 이번 전시에서, 작품과 그 뒤의 이야기를 만나보세요.'
    ),
    ctaLabel: '전시 자세히 보기',
    ctaUrl: 'https://www.saf2026.com',
  },
  {
    id: 'customer-collection',
    label: '컬렉션·기획전 추천',
    description: '큐레이션 컬렉션 소개 (광고)',
    channel: 'customer',
    isAdvertisement: true,
    subject: '이런 작품은 어떠세요 — 큐레이션 추천',
    ...body(
      '{{name}}님께 씨앗페가 엄선한 컬렉션을 소개합니다.\n\n공간과 취향에 어울리는 작품을 모았습니다. 한 점의 구매가 한 예술인의 회복으로 이어집니다.'
    ),
    ctaLabel: '컬렉션 보기',
    ctaUrl: 'https://www.saf2026.com/collections',
  },
  // ── 청원 (petition) ──
  {
    id: 'petition-progress',
    label: '진행 상황 업데이트',
    description: '서명자에게 청원 진행 상황 공유',
    channel: 'petition',
    isAdvertisement: false,
    subject: '청원 진행 상황을 알려드립니다',
    ...body(
      '{{name}}님, 함께 서명해 주셔서 감사합니다.\n\n청원 진행 상황을 공유드립니다. 여러분의 목소리가 변화를 만들고 있습니다.'
    ),
    ctaLabel: '청원 페이지 보기',
    ctaUrl: 'https://www.saf2026.com',
  },
  {
    id: 'petition-deadline',
    label: '목표·마감 임박 안내',
    description: '서명 목표·마감 임박 독려',
    channel: 'petition',
    isAdvertisement: false,
    subject: '마감이 다가옵니다 — 함께 마지막까지',
    ...body(
      '{{name}}님, 청원 마감이 다가오고 있습니다.\n\n조금만 더 힘을 모으면 목표에 닿을 수 있습니다. 주변에도 알려주시면 큰 힘이 됩니다.'
    ),
    ctaLabel: '함께 알리기',
    ctaUrl: 'https://www.saf2026.com',
  },
  {
    id: 'petition-result',
    label: '결과 보고·감사',
    description: '청원 결과 보고 및 감사',
    channel: 'petition',
    isAdvertisement: false,
    subject: '청원 결과를 보고드립니다',
    ...body(
      '{{name}}님, 함께해 주신 모든 분께 결과를 보고드립니다.\n\n여러분의 연대가 만든 변화를 전합니다. 진심으로 감사합니다.'
    ),
  },
  // ── 개별 발송 (individual) ──
  {
    id: 'individual-inquiry-reply',
    label: '문의 답변',
    description: '개별 문의에 대한 답변 (운영)',
    channel: 'individual',
    isAdvertisement: false,
    subject: '문의 주신 내용에 답변드립니다',
    ...body(
      '{{name}}님, 문의해 주셔서 감사합니다.\n\n문의하신 내용에 대해 아래와 같이 답변드립니다.'
    ),
  },
  {
    id: 'individual-purchase-guide',
    label: '구매 관련 개별 안내',
    description: '특정 구매자에게 개별 안내 (운영)',
    channel: 'individual',
    isAdvertisement: false,
    subject: '구매하신 작품 관련 안내',
    ...body(
      '{{name}}님, 구매하신 작품과 관련하여 안내드릴 내용이 있어 연락드립니다.\n\n자세한 내용은 아래를 확인해 주세요.'
    ),
  },
];
