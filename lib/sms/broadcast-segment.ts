// 관리자 SMS 발송의 "받는 사람"을 discriminated union으로 표현하는 클라이언트 모델.
// email broadcast-segment.ts의 SMS 축소판: petition·artwork-buyer 제거, body_text 단일.
// 순수 함수 모듈 — supabase 등 서버 모듈을 import하지 않아 클라이언트 번들에 안전.

import type { SmsBroadcastChannel } from '@/lib/sms/audiences/types';

export interface SmsSelectedContact {
  phone: string;
  name: string | null;
}

// 직접 지정(direct) 1회 발송 상한 — 임의 대량 발송 방어. 서버·UI 공통 강제.
export const MAX_DIRECT_RECIPIENTS = 500;

export type SmsMemberSubset = 'all' | 'artist' | 'exhibitor';

export type SmsRecipientSegment =
  | { kind: 'member'; subset: SmsMemberSubset }
  | { kind: 'customer' }
  | { kind: 'direct'; contacts: SmsSelectedContact[]; advertising: boolean };

export type SmsRecipientKind = SmsRecipientSegment['kind'];

export const SMS_RECIPIENT_KINDS: SmsRecipientKind[] = ['member', 'customer', 'direct'];

export function defaultSegment(kind: SmsRecipientKind): SmsRecipientSegment {
  switch (kind) {
    case 'member':
      return { kind: 'member', subset: 'all' };
    case 'customer':
      return { kind: 'customer' };
    case 'direct':
      return { kind: 'direct', contacts: [], advertising: false };
  }
}

export interface SmsRecipientKindMeta {
  kind: SmsRecipientKind;
  label: string;
  description: string;
  advertising: 'always' | 'optional' | 'never';
}

export const SMS_RECIPIENT_KIND_META: Record<SmsRecipientKind, SmsRecipientKindMeta> = {
  member: {
    kind: 'member',
    label: '작가·출품자',
    description: '참여 작가와 출품자에게 업무·전시 안내 (정보성)',
    advertising: 'never',
  },
  customer: {
    kind: 'customer',
    label: '고객 마케팅',
    description: '마케팅 동의·최근 거래 고객에게 신작·전시 홍보 (광고)',
    advertising: 'always',
  },
  direct: {
    kind: 'direct',
    label: '직접 지정',
    description: '전화번호를 직접 입력 (개별 안내·답변, 기본 정보성)',
    advertising: 'optional',
  },
};

// 광고 여부의 단일 출처. 서버(admin-sms-broadcast.ts)가 결정 권한을 가지며 이 값은 그 규칙을 미러.
export function deriveIsAdvertisement(seg: SmsRecipientSegment): boolean {
  switch (seg.kind) {
    case 'customer':
      return true;
    case 'direct':
      return seg.advertising;
    case 'member':
      return false;
  }
}

// 발송 전 차단 사유. manualPending: direct 모드에서 입력 중인 번호가 아직 "추가" 안 됨.
export function segmentBlockReason(
  seg: SmsRecipientSegment,
  manualPending: boolean
): string | null {
  switch (seg.kind) {
    case 'direct':
      if (manualPending) {
        return '입력 중인 번호가 아직 추가되지 않았습니다. "입력한 번호 추가" 버튼을 눌러주세요.';
      }
      if (seg.contacts.length === 0) return '받는 사람을 1명 이상 추가해주세요.';
      if (seg.contacts.length > MAX_DIRECT_RECIPIENTS) {
        return `직접 지정은 한 번에 최대 ${MAX_DIRECT_RECIPIENTS.toLocaleString('ko-KR')}명까지 보낼 수 있습니다. 그룹 발송을 이용하세요.`;
      }
      return null;
    case 'member':
    case 'customer':
      return null;
  }
}

export function isDirectSegment(
  seg: SmsRecipientSegment
): seg is Extract<SmsRecipientSegment, { kind: 'direct' }> {
  return seg.kind === 'direct';
}

export interface SmsBroadcastContent {
  bodyText: string;
}

export interface SmsGroupBroadcastInput {
  channel: SmsBroadcastChannel;
  bodyText: string;
  audienceFilter: Record<string, unknown>;
  isAdvertisement: boolean;
}

export function buildGroupInput(
  seg: Exclude<SmsRecipientSegment, { kind: 'direct' }>,
  content: SmsBroadcastContent
): SmsGroupBroadcastInput {
  const isAdvertisement = deriveIsAdvertisement(seg);
  const base = { bodyText: content.bodyText, isAdvertisement };
  switch (seg.kind) {
    case 'member':
      return { ...base, channel: 'member', audienceFilter: { subset: seg.subset } };
    case 'customer':
      return { ...base, channel: 'customer', audienceFilter: {} };
  }
}
