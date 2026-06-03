// 관리자 이메일 발송의 "받는 사람"을 하나의 discriminated union으로 표현하는 클라이언트 모델.
//
// 기존 BroadcastForm은 mode('segment'|'search') 토글 + channel + isArtworkBuyer 합성 인코딩 +
// 광고 플래그 4갈래 분산(customer 서버 강제 / artwork-buyer 체크박스 / search 체크박스 / member·petition 없음)
// 으로 분기가 13개 useState·6곳에 누수돼 있었다. 이 파일은 그 분기를 한 곳으로 격리한다:
//   - 광고 여부의 단일 출처(deriveIsAdvertisement)
//   - previewAudience 인자 매핑(segmentToPreviewArgs)
//   - 두 server action(enqueueBroadcast / enqueueIndividualBroadcast) 중 어디로 갈지 + payload(buildGroupInput)
//   - 발송 전 차단 사유(segmentBlockReason)
//
// 백엔드 server action 시그니처와 정통망법 로직은 무변경 — 이 어댑터가 UI 상태를 기존 계약으로 번역만 한다.
// 순수 함수 모듈이라 단위 테스트 가능하고, 서버 모듈(supabase 등)을 import하지 않아 클라이언트 번들에 안전하다.

import type { BroadcastChannel } from '@/lib/email/audiences/types';

export interface SelectedContact {
  email: string;
  name: string | null;
}

// 직접 지정(individual) 1회 발송 수신자 상한 — 임의 대량 발송(오발송·도메인 평판 훼손) 방어.
// 서버(enqueueIndividualBroadcast)와 UI(segmentBlockReason)가 같은 값을 강제.
export const MAX_DIRECT_RECIPIENTS = 500;

export type MemberSubset = 'all' | 'artist' | 'exhibitor';

export type RecipientSegment =
  | { kind: 'member'; subset: MemberSubset }
  | { kind: 'customer' }
  | { kind: 'petition'; petitionSlug: string }
  | { kind: 'artwork-buyer'; artworkId: string; advertising: boolean }
  | { kind: 'direct'; contacts: SelectedContact[]; advertising: boolean };

export type RecipientKind = RecipientSegment['kind'];

export const RECIPIENT_KINDS: RecipientKind[] = [
  'member',
  'customer',
  'petition',
  'artwork-buyer',
  'direct',
];

// 타입 카드 선택 시 잔류 상태(이전 종류의 artworkId/advertising 등) 부활을 막기 위해
// 항상 해당 종류의 깨끗한 기본값으로 교체한다.
export function defaultSegment(kind: RecipientKind): RecipientSegment {
  switch (kind) {
    case 'member':
      return { kind: 'member', subset: 'all' };
    case 'customer':
      return { kind: 'customer' };
    case 'petition':
      return { kind: 'petition', petitionSlug: '' };
    case 'artwork-buyer':
      // 기본은 정보성(개별 안내) — 광고로 보낼 때만 관리자가 체크(체크 시 최근 6개월 구매자로 제한).
      return { kind: 'artwork-buyer', artworkId: '', advertising: false };
    case 'direct':
      return { kind: 'direct', contacts: [], advertising: false };
  }
}

export interface RecipientKindMeta {
  kind: RecipientKind;
  label: string;
  description: string;
  // 광고 성격: 'always'=항상 광고(법적), 'optional'=토글로 선택, 'never'=정보성 전용
  advertising: 'always' | 'optional' | 'never';
}

export const RECIPIENT_KIND_META: Record<RecipientKind, RecipientKindMeta> = {
  member: {
    kind: 'member',
    label: '작가·출품자',
    description: '참여 작가와 출품자에게 업무·정산·전시 안내',
    advertising: 'never',
  },
  customer: {
    kind: 'customer',
    label: '고객 마케팅',
    description: '마케팅 동의·최근 거래 고객에게 신작·전시 홍보',
    advertising: 'always',
  },
  petition: {
    kind: 'petition',
    label: '청원 서명자',
    description: '서명자에게 진행 상황·결과 보고',
    advertising: 'never',
  },
  'artwork-buyer': {
    kind: 'artwork-buyer',
    label: '특정 작품 구매자',
    description: '한 작품을 구매한 고객에게 개별 안내',
    advertising: 'optional',
  },
  direct: {
    kind: 'direct',
    label: '직접 지정·검색',
    description: '명단에서 찾거나 이메일을 직접 입력 (문의 답변·개별 안내 등, 기본 정보성)',
    advertising: 'optional',
  },
};

// ── 광고 여부의 단일 출처 ────────────────────────────────────────────────
// 표시(제목 (광고) 배지·요약·야간 경고)와 테스트 발송이 모두 이 함수 하나만 본다.
// 결정 권한은 서버(admin-broadcast.ts)에 남으며, 이 값은 그 규칙을 미러링한다:
//   - customer 광범위 세그먼트: 서버가 isAdvertisement=true 강제 → 항상 true
//   - artwork-buyer / direct: 관리자 토글
//   - member / petition: 정보성, 광고 아님
export function deriveIsAdvertisement(seg: RecipientSegment): boolean {
  switch (seg.kind) {
    case 'customer':
      return true;
    case 'artwork-buyer':
    case 'direct':
      return seg.advertising;
    case 'member':
    case 'petition':
      return false;
  }
}

// ── previewAudience 인자 매핑 ────────────────────────────────────────────
// direct는 서버 미리보기가 없다(선택된 연락처 수가 곧 대상 수) → null 반환.
// 필수 선택(청원/작품)이 비어 있으면 null → 호출 측이 "선택 필요" 상태로 처리.
export interface PreviewArgs {
  channel: BroadcastChannel;
  filter: {
    subset?: MemberSubset;
    petitionSlug?: string;
    artworkId?: string;
    advertising?: boolean;
  };
}

export function segmentToPreviewArgs(seg: RecipientSegment): PreviewArgs | null {
  switch (seg.kind) {
    case 'member':
      return { channel: 'member', filter: { subset: seg.subset } };
    case 'customer':
      return { channel: 'customer', filter: {} };
    case 'petition':
      return seg.petitionSlug
        ? { channel: 'petition', filter: { petitionSlug: seg.petitionSlug } }
        : null;
    case 'artwork-buyer':
      return seg.artworkId
        ? {
            channel: 'customer',
            filter: { artworkId: seg.artworkId, advertising: seg.advertising },
          }
        : null;
    case 'direct':
      return null;
  }
}

// ── 발송 전 차단 사유 ────────────────────────────────────────────────────
// manualPending: direct 모드에서 입력 중인 유효 이메일이 아직 "추가" 안 된 상태.
export function segmentBlockReason(seg: RecipientSegment, manualPending: boolean): string | null {
  switch (seg.kind) {
    case 'petition':
      return seg.petitionSlug ? null : '청원 캠페인 알림은 청원을 먼저 선택해야 합니다.';
    case 'artwork-buyer':
      return seg.artworkId.trim() ? null : '특정 작품 구매자는 작품을 먼저 선택해야 합니다.';
    case 'direct':
      if (manualPending) {
        return '입력 중인 이메일이 아직 추가되지 않았습니다. "입력한 이메일 추가" 버튼을 눌러주세요.';
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
  seg: RecipientSegment
): seg is Extract<RecipientSegment, { kind: 'direct' }> {
  return seg.kind === 'direct';
}

// ── 그룹 발송(enqueueBroadcast) payload 빌더 ────────────────────────────
// direct는 그룹이 아니므로 호출 측에서 enqueueIndividualBroadcast로 분기한다.
// audienceFilter 구조는 기존 BroadcastForm이 보내던 형태를 그대로 보존:
//   member  → { subset }
//   customer→ {}
//   petition→ {} (+ 별도 petitionSlug 인자)
//   artwork → { subset, artworkId, mode:'artwork-buyer' }
export interface BroadcastContent {
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface GroupBroadcastInput {
  channel: BroadcastChannel;
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  petitionSlug?: string;
  audienceFilter: Record<string, unknown>;
  isAdvertisement: boolean;
}

export function buildGroupInput(
  seg: Exclude<RecipientSegment, { kind: 'direct' }>,
  content: BroadcastContent
): GroupBroadcastInput {
  const isAdvertisement = deriveIsAdvertisement(seg);
  const base = {
    subject: content.subject,
    bodyMd: content.bodyMd,
    ctaLabel: content.ctaLabel || undefined,
    ctaUrl: content.ctaUrl || undefined,
    isAdvertisement,
  };

  switch (seg.kind) {
    case 'member':
      return { ...base, channel: 'member', audienceFilter: { subset: seg.subset } };
    case 'customer':
      return { ...base, channel: 'customer', audienceFilter: {} };
    case 'petition':
      return {
        ...base,
        channel: 'petition',
        petitionSlug: seg.petitionSlug,
        audienceFilter: {},
      };
    case 'artwork-buyer':
      return {
        ...base,
        channel: 'customer',
        audienceFilter: { subset: 'all', artworkId: seg.artworkId, mode: 'artwork-buyer' },
      };
  }
}
