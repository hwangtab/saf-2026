// SMS 브로드캐스트 정형 문구 템플릿.
// 트랜잭션(입금확인·배송알림)은 자동발송 전용이므로 제외. 브로드캐스트(공지·캠페인) 문구만 포함.
// 광고 템플릿은 본문에 (광고) prefix가 없어도 됨 — buildAdvertisementText가 발송 직전 자동 부착.
// {{name}}은 수신자 이름으로 치환됨.

import type { SmsBroadcastChannel } from '@/lib/sms/audiences/types';

export interface SmsBroadcastTemplate {
  id: string;
  name: string;
  /** 드롭다운에 표시할 설명 */
  description: string;
  bodyText: string;
  isAdvertisement?: boolean;
  /** 이 템플릿이 적합한 채널. 미지정이면 모든 채널에 노출. */
  allowedChannels?: SmsBroadcastChannel[];
}

export const SMS_BROADCAST_TEMPLATES: SmsBroadcastTemplate[] = [
  // ── 청원 서명자 (petition) ──
  {
    id: 'petition-progress',
    name: '청원 진행 보고',
    description: '서명자에게 청원 진행 현황 공유',
    allowedChannels: ['petition'],
    isAdvertisement: false,
    bodyText:
      '[씨앗페] {{name}}님, 함께 서명해 주셔서 감사합니다.\n청원이 계속 진행 중입니다. 더 많은 분들께 알려주시면 큰 힘이 됩니다.\n자세한 내용: saf2026.com',
  },
  {
    id: 'petition-result',
    name: '청원 결과 보고',
    description: '청원 종료 후 결과·감사 안내',
    allowedChannels: ['petition'],
    isAdvertisement: false,
    bodyText:
      '[씨앗페] {{name}}님, 청원 결과를 보고드립니다.\n여러분의 연대가 변화를 만들었습니다. 진심으로 감사드립니다.\nsaf2026.com',
  },

  // ── 작가·출품자 (member) ──
  {
    id: 'member-exhibition-notice',
    name: '전시 일정 공지',
    description: '참여 작가에게 전시 일정 안내',
    allowedChannels: ['member'],
    isAdvertisement: false,
    bodyText:
      '[씨앗페] {{name}}님, 씨앗페 2026 전시 일정을 안내드립니다.\n일정과 준비 사항은 이메일을 확인해 주세요.\n문의: contact@kosmart.org',
  },
  {
    id: 'member-general-notice',
    name: '일반 공지',
    description: '작가·출품자 대상 운영 공지',
    allowedChannels: ['member'],
    isAdvertisement: false,
    bodyText:
      '[씨앗페] {{name}}님께 안내드립니다.\n자세한 내용은 이메일을 확인해 주시거나 saf2026.com을 방문해 주세요.',
  },

  // ── 고객 마케팅 (customer, 광고) ──
  {
    id: 'customer-new-artwork',
    name: '신작 안내 (광고)',
    description: '새로 등록된 작품 소개 — 광고 자동 부착',
    allowedChannels: ['customer'],
    isAdvertisement: true,
    // 광고 본문: buildAdvertisementText가 (광고)/[씨앗페]/무료수신거부를 자동 부착하므로
    // 여기선 핵심 내용만 작성. 단, (광고)가 없어도 자동으로 prepend됨.
    bodyText:
      '{{name}}님, 씨앗페에 새로운 작품이 등록되었습니다.\n작품 구매 수익은 동료 예술인을 위한 상호부조 기금이 됩니다.\nsaf2026.com/artworks',
  },

  // ── 직접 지정 / 공통 ──
  {
    id: 'direct-general',
    name: '개별 안내 (직접 지정)',
    description: '직접 입력 수신자에게 개별 안내',
    allowedChannels: ['individual'],
    isAdvertisement: false,
    bodyText:
      '[씨앗페] {{name}}님, 안내드릴 사항이 있어 연락드립니다.\n자세한 내용은 회신 또는 이메일로 문의해 주세요.',
  },
];
