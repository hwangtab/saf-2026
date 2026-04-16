import type { ActivityLogEntry } from '@/app/actions/admin-logs';

export type LocaleCode = 'ko' | 'en';

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

export const ACTION_PREFIX_TRANSLATIONS: Array<[RegExp, string]> = [
  [/^사용자 승인:/, 'User approved:'],
  [/^사용자 거절:/, 'User rejected:'],
  [/^사용자 재활성화:/, 'User reactivated:'],
  [/^권한 변경:/, 'Role changed:'],
  [/^작품 수정:/, 'Artwork updated:'],
  [/^작품 등록:/, 'Artwork created:'],
  [/^작품 삭제:/, 'Artwork deleted:'],
  [/^작품 이미지 변경/, 'Artwork images updated'],
  [/^작가 정보 수정:/, 'Artist updated:'],
  [/^작가 등록:/, 'Artist created:'],
  [/^작가 삭제:/, 'Artist deleted:'],
  [/^작가 계정 연결:/, 'Artist linked to user:'],
  [/^작가 계정 연결 해제:/, 'Artist unlinked from user:'],
  [/^아티스트 프로필 수정:/, 'Artist profile updated:'],
  [/^아티스트 프로필 이미지 변경:/, 'Artist profile image updated:'],
  [/^아티스트 작품 등록:/, 'Artist artwork created:'],
  [/^아티스트 작품 수정:/, 'Artist artwork updated:'],
  [/^아티스트 작품 삭제:/, 'Artist artwork deleted:'],
  [/^아티스트 신청서 제출:/, 'Artist application submitted:'],
  [/^출품자 신청서 제출:/, 'Exhibitor application submitted:'],
  [/^출품자 작가 등록:/, 'Exhibitor artist created:'],
  [/^출품자 작가 수정:/, 'Exhibitor artist updated:'],
  [/^출품자 작가 프로필 이미지 변경:/, 'Exhibitor artist profile image updated:'],
  [/^출품자 작가 삭제:/, 'Exhibitor artist deleted:'],
  [/^출품자 작품 등록:/, 'Exhibitor artwork created:'],
  [/^출품자 작품 수정:/, 'Exhibitor artwork updated:'],
  [/^출품자 작품 이미지 변경:/, 'Exhibitor artwork images updated:'],
  [/^출품자 작품 삭제:/, 'Exhibitor artwork deleted:'],
  [/^복구 실행:/, 'Revert executed:'],
  [/^휴지통 영구 삭제:/, 'Trash purged:'],
  [/^콘텐츠 생성:/, 'Content created:'],
  [/^콘텐츠 수정:/, 'Content updated:'],
  [/^콘텐츠 삭제:/, 'Content deleted:'],
  [/^뉴스 생성:/, 'News created:'],
  [/^뉴스 수정:/, 'News updated:'],
  [/^뉴스 삭제:/, 'News deleted:'],
  [/^FAQ 생성:/, 'FAQ created:'],
  [/^FAQ 수정:/, 'FAQ updated:'],
  [/^FAQ 삭제:/, 'FAQ deleted:'],
  [/^영상 생성:/, 'Video created:'],
  [/^영상 수정:/, 'Video updated:'],
  [/^영상 삭제:/, 'Video deleted:'],
  [/^추천사 수정:/, 'Testimonial updated:'],
  [/^일괄 상태 변경:/, 'Batch status changed:'],
  [/^일괄 숨김 변경:/, 'Batch visibility changed:'],
  [/^일괄 삭제:/, 'Batch delete:'],
  [/^구매링크 누락 동기화:/, 'Missing purchase-link sync:'],
  [/^판매 기록 등록:/, 'Sale recorded:'],
  [/^판매 기록 수정$/, 'Sale updated'],
  [/^판매 취소:/, 'Sale voided:'],
  [/^카테고리 변경:/, 'Category changed:'],
  [/^출품자 승인:/, 'Exhibitor approved:'],
  [/^출품자 정지:/, 'Exhibitor suspended:'],
  [/^추천사 생성:/, 'Testimonial created:'],
  [/^추천사 삭제:/, 'Testimonial deleted:'],
  [/^입금 확인:/, 'Deposit confirmed:'],
  [/^입금대기 주문 취소:/, 'Awaiting-deposit order cancelled:'],
  [/^주문 상태 변경:/, 'Order status changed:'],
  [/^운송장 정보 수정:/, 'Tracking info updated:'],
  [/^주문 환불:/, 'Order refunded:'],
  [/^작품 데이터 다운로드:/, 'Artwork data exported:'],
  [/^작가 연락처 다운로드:/, 'Artist contacts exported:'],
  [/^정의되지 않은 활동/, 'Unknown activity'],
  [/일부 항목 확인 필요/g, 'check some items'],
  [/원인 확인 필요/g, 'cause needs investigation'],
  [/건/g, ' items'],
  [/명/g, ' people'],
  [/점/g, ' items'],
  [/총 /g, 'Total '],
];

export type LogsListProps = {
  logs: ActivityLogEntry[];
  currentPage: number;
  totalPages: number;
  total: number;
};

export function localizeActionText(text: string, locale: LocaleCode): string {
  if (locale === 'ko') return text;
  return ACTION_PREFIX_TRANSLATIONS.reduce((acc, [pattern, replacement]) => {
    if (pattern.global) {
      return acc.replace(pattern, replacement);
    }
    return pattern.test(acc) ? acc.replace(pattern, replacement) : acc;
  }, text);
}

export function formatActionDescription(log: ActivityLogEntry, locale: LocaleCode): string {
  const details = log.metadata as Record<string, unknown> | null;
  let text: string;

  switch (log.action) {
    case 'user_approved':
      text = `사용자 승인: ${details?.user_name || log.target_id}`;
      break;
    case 'user_rejected':
      text = `사용자 거절: ${details?.user_name || log.target_id}`;
      break;
    case 'user_reactivated':
      text = `사용자 재활성화: ${details?.user_name || log.target_id}`;
      break;
    case 'user_role_changed': {
      const from = typeof details?.from === 'string' ? details.from : null;
      const to = typeof details?.to === 'string' ? details.to : null;
      text = `권한 변경: ${details?.user_name || log.target_id}${from ? ` (${from} → ${to || '-'})` : ` → ${to || '-'}`}`;
      break;
    }
    case 'artwork_updated':
      text = `작품 수정: ${details?.title || log.target_id}`;
      break;
    case 'artwork_created':
      text = `작품 등록: ${details?.title || log.target_id}`;
      break;
    case 'artwork_deleted':
      text = `작품 삭제: ${details?.title || log.target_id}`;
      break;
    case 'artwork_images_updated':
      text = '작품 이미지 변경';
      break;
    case 'artist_updated':
      text = `작가 정보 수정: ${details?.name || log.target_id}`;
      break;
    case 'artist_created':
      text = `작가 등록: ${details?.name || log.target_id}`;
      break;
    case 'artist_deleted':
      text = `작가 삭제: ${details?.name || log.target_id}`;
      break;
    case 'artist_linked_to_user':
      text = `작가 계정 연결: ${details?.artist_name || log.target_id}`;
      break;
    case 'artist_unlinked_from_user':
      text = `작가 계정 연결 해제: ${details?.artist_name || log.target_id}`;
      break;
    case 'artist_profile_updated':
      text = `아티스트 프로필 수정: ${details?.name || log.target_id}`;
      break;
    case 'artist_profile_image_updated':
      text = `아티스트 프로필 이미지 변경: ${details?.name || log.target_id}`;
      break;
    case 'artist_artwork_created':
      text = `아티스트 작품 등록: ${details?.title || log.target_id}`;
      break;
    case 'artist_artwork_updated':
      text = `아티스트 작품 수정: ${details?.title || log.target_id}`;
      break;
    case 'artist_artwork_deleted':
      text = `아티스트 작품 삭제: ${details?.title || log.target_id}`;
      break;
    case 'artist_application_submitted':
      text = `아티스트 신청서 제출: ${details?.artist_name || log.target_id}`;
      break;
    case 'exhibitor_application_submitted':
      text = `출품자 신청서 제출: ${details?.representative_name || log.target_id}`;
      break;
    case 'exhibitor_artist_created':
      text = `출품자 작가 등록: ${details?.name || log.target_id}`;
      break;
    case 'exhibitor_artist_updated':
      text = `출품자 작가 수정: ${details?.name || log.target_id}`;
      break;
    case 'exhibitor_artist_profile_image_updated':
      text = `출품자 작가 프로필 이미지 변경: ${details?.name || log.target_id}`;
      break;
    case 'exhibitor_artist_deleted':
      text = `출품자 작가 삭제: ${details?.name || log.target_id}`;
      break;
    case 'exhibitor_artwork_created':
      text = `출품자 작품 등록: ${details?.title || log.target_id}`;
      break;
    case 'exhibitor_artwork_updated':
      text = `출품자 작품 수정: ${details?.title || log.target_id}`;
      break;
    case 'exhibitor_artwork_images_updated':
      text = `출품자 작품 이미지 변경: ${details?.title || log.target_id}`;
      break;
    case 'exhibitor_artwork_deleted':
      text = `출품자 작품 삭제: ${details?.title || log.target_id}`;
      break;
    case 'revert_executed':
      text =
        locale === 'en'
          ? `Revert executed: log ${details?.reverted_log_id || '-'}`
          : `복구 실행: 로그 ${details?.reverted_log_id || '-'}`;
      break;
    case 'trash_purged': {
      const purgedLogId = typeof details?.purged_log_id === 'string' ? details.purged_log_id : '-';
      const targetNamesRaw =
        details?.target_names &&
        typeof details.target_names === 'object' &&
        !Array.isArray(details.target_names)
          ? (details.target_names as Record<string, unknown>)
          : null;
      const mappedTargetName =
        targetNamesRaw && typeof targetNamesRaw[log.target_id] === 'string'
          ? (targetNamesRaw[log.target_id] as string)
          : null;
      const targetName =
        (typeof details?.target_name === 'string' && details.target_name) ||
        mappedTargetName ||
        (typeof details?.title === 'string' && details.title) ||
        (typeof details?.name === 'string' && details.name) ||
        null;
      text =
        locale === 'en'
          ? `Trash purged: ${targetName || getLogTargetDisplayName(log, locale)} (log ${purgedLogId})`
          : `휴지통 영구 삭제: ${targetName || getLogTargetDisplayName(log, locale)} (로그 ${purgedLogId})`;
      break;
    }
    case 'content_created':
      text = `콘텐츠 생성: ${log.target_type} - ${details?.title || log.target_id}`;
      break;
    case 'content_updated':
      text = `콘텐츠 수정: ${log.target_type} - ${details?.title || log.target_id}`;
      break;
    case 'content_deleted':
      text = `콘텐츠 삭제: ${log.target_type} - ${log.target_id}`;
      break;
    case 'news_created':
      text = `뉴스 생성: ${details?.title || log.target_id}`;
      break;
    case 'news_updated':
      text = `뉴스 수정: ${details?.title || log.target_id}`;
      break;
    case 'news_deleted':
      text = `뉴스 삭제: ${details?.title || log.target_id}`;
      break;
    case 'faq_created':
      text = `FAQ 생성: ${details?.question_en || details?.question || log.target_id}`;
      break;
    case 'faq_updated':
      text = `FAQ 수정: ${details?.question_en || details?.question || log.target_id}`;
      break;
    case 'faq_deleted':
      text = `FAQ 삭제: ${details?.question_en || details?.question || log.target_id}`;
      break;
    case 'video_created':
      text = `영상 생성: ${details?.title || log.target_id}`;
      break;
    case 'video_updated':
      text = `영상 수정: ${details?.title || log.target_id}`;
      break;
    case 'video_deleted':
      text = `영상 삭제: ${details?.title || log.target_id}`;
      break;
    case 'testimonial_updated':
      text = `추천사 수정: ${details?.author || log.target_id}`;
      break;
    case 'batch_artwork_status':
      text = `일괄 상태 변경: ${details?.count}건 → ${formatStatus(details?.status, locale) || details?.status}`;
      break;
    case 'batch_artwork_visibility':
      text = `일괄 숨김 변경: ${details?.count}건`;
      break;
    case 'batch_artwork_deleted':
      text = `일괄 삭제: ${details?.count}건`;
      break;
    case 'artwork_sold':
      text = `판매 기록 등록: ${details?.quantity || 1}점`;
      break;
    case 'artwork_sale_updated':
      text = '판매 기록 수정';
      break;
    case 'artwork_sale_voided':
      text = `판매 취소: ${details?.quantity || ''}점`;
      break;
    case 'update_artwork_category':
      text = `카테고리 변경: ${details?.category || '없음'}`;
      break;
    case 'approve_exhibitor':
      text = `출품자 승인: ${details?.user_name || log.target_id}`;
      break;
    case 'suspend_exhibitor':
      text = `출품자 정지: ${details?.user_name || log.target_id}`;
      break;
    case 'testimonial_created':
      text = `추천사 생성: ${details?.author || log.target_id}`;
      break;
    case 'testimonial_deleted':
      text = `추천사 삭제: ${details?.author || log.target_id}`;
      break;
    case 'order_deposit_confirmed':
      text = `입금 확인: ${details?.order_no || log.target_id}`;
      break;
    case 'order_awaiting_cancelled':
      text = `입금대기 주문 취소: ${details?.order_no || log.target_id}`;
      break;
    case 'order_status_updated':
      text = `주문 상태 변경: ${details?.order_no || log.target_id} (${formatOrderStatus(details?.from_status, locale) || details?.from_status || '-'} → ${formatOrderStatus(details?.to_status, locale) || details?.to_status || '-'})`;
      break;
    case 'order_tracking_updated':
      text = `운송장 정보 수정: ${details?.order_no || log.target_id}`;
      break;
    case 'order_refunded':
      text = `주문 환불: ${details?.order_no || log.target_id}`;
      break;
    case 'artworks_exported':
      text = `작품 데이터 다운로드: ${details?.total_count || '-'}건`;
      break;
    case 'artist_contacts_exported':
      text = `작가 연락처 다운로드: ${details?.total_count || '-'}명`;
      break;
    default:
      text = `정의되지 않은 활동 (${log.action})`;
      break;
  }

  return localizeActionText(text, locale);
}

export function getActionReason(
  log: ActivityLogEntry,
  _locale: LocaleCode,
  t: TranslationFn
): { label: string; value: string } | null {
  const details = log.metadata as Record<string, unknown> | null;
  const metadataReason = typeof details?.reason === 'string' ? details.reason.trim() : '';
  const revertReason = typeof log.revert_reason === 'string' ? log.revert_reason.trim() : '';
  const purgeNote = typeof log.purge_note === 'string' ? log.purge_note.trim() : '';

  if (revertReason) return { label: t('revertReason'), value: revertReason };
  if (purgeNote) return { label: t('purgeReason'), value: purgeNote };

  if (metadataReason) {
    if (log.action === 'revert_executed')
      return { label: t('revertReason'), value: metadataReason };
    if (log.action === 'trash_purged') return { label: t('purgeReason'), value: metadataReason };
    return { label: t('reason'), value: metadataReason };
  }

  return null;
}

export function getActorRoleLabel(role: ActivityLogEntry['actor_role'], t: TranslationFn) {
  switch (role) {
    case 'admin':
      return t('actorRoleAdmin');
    case 'artist':
      return t('actorRoleArtist');
    case 'exhibitor':
      return t('actorRoleExhibitor');
    case 'system':
      return t('actorRoleSystem');
    default:
      return role;
  }
}

export function getActorDisplay(log: ActivityLogEntry, t: TranslationFn) {
  if (log.actor_name) return log.actor_name;
  if (log.actor_email) return log.actor_email;
  if (log.actor_id) return `${getActorRoleLabel(log.actor_role, t)} #${log.actor_id.slice(0, 8)}`;
  return t('unknownActor');
}

export function formatDate(dateString: string | null | undefined, locale: LocaleCode) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTargetTypeLabel(type: string | null, t: TranslationFn) {
  switch (type) {
    case 'user':
      return t('targetTypeUser');
    case 'order':
      return t('targetTypeOrder');
    case 'artwork':
      return t('targetTypeArtwork');
    case 'artist':
      return t('targetTypeArtist');
    case 'news':
      return t('targetTypeNews');
    case 'faq':
      return 'FAQ';
    case 'testimonial':
      return t('targetTypeTestimonial');
    case 'video':
      return t('targetTypeVideo');
    default:
      return type || '-';
  }
}

export function getTargetLink(log: ActivityLogEntry): string | null {
  if (!log.target_id) return null;

  if (log.target_id === 'all') {
    if (log.target_type === 'order') return '/admin/orders';
    if (log.target_type === 'artwork') return '/admin/artworks';
    if (log.target_type === 'artist') return '/admin/artists';
    if (log.target_type === 'user') return '/admin/users';
    return null;
  }

  if (log.target_id.includes(',')) {
    return log.target_type === 'artwork' ? '/admin/artworks' : null;
  }

  switch (log.target_type) {
    case 'user':
      return '/admin/users';
    case 'order':
      return `/admin/orders/${log.target_id}`;
    case 'artwork':
      return `/admin/artworks/${log.target_id}`;
    case 'artist':
      return `/admin/artists/${log.target_id}`;
    default:
      return null;
  }
}

export type DiffRow = {
  field: string;
  before: unknown;
  after: unknown;
};

export type DiffItem = {
  itemId: string;
  itemLabel: string | null;
  changes: DiffRow[];
};

export function isLikelyUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function formatIdentifier(value: string, t: TranslationFn) {
  if (!value) return '-';
  if (value.includes(',')) return t('multipleTargets');
  if (isLikelyUuid(value)) return `${value.slice(0, 8)}...`;
  return value;
}

export function formatIdentifierLabel(value: string, t: TranslationFn) {
  return t('identifierLabel', { value: formatIdentifier(value, t) });
}

export function getSnapshotDisplayName(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;

  const title = typeof snapshot.title === 'string' ? snapshot.title : null;
  const nameKo = typeof snapshot.name_ko === 'string' ? snapshot.name_ko : null;
  const name = typeof snapshot.name === 'string' ? snapshot.name : null;
  const artistName = typeof snapshot.artist_name === 'string' ? snapshot.artist_name : null;
  const representativeName =
    typeof snapshot.representative_name === 'string' ? snapshot.representative_name : null;

  return title || nameKo || name || artistName || representativeName || null;
}

export function getLogTargetDisplayName(log: ActivityLogEntry, locale: LocaleCode): string {
  const details = log.metadata as Record<string, unknown> | null;
  const targetNameFromMetadata =
    details && typeof details.target_name === 'string' ? details.target_name : null;
  if (targetNameFromMetadata) return targetNameFromMetadata;

  const fromDetails =
    (typeof details?.order_no === 'string' && details.order_no) ||
    (typeof details?.title === 'string' && details.title) ||
    (typeof details?.name === 'string' && details.name) ||
    (typeof details?.user_name === 'string' && details.user_name) ||
    (typeof details?.buyer_name === 'string' && details.buyer_name) ||
    (typeof details?.artist_name === 'string' && details.artist_name) ||
    (typeof details?.representative_name === 'string' && details.representative_name) ||
    null;

  if (fromDetails) return fromDetails;

  const afterObj = toObject(log.after_snapshot);
  const beforeObj = toObject(log.before_snapshot);
  const fromSnapshot = getSnapshotDisplayName(afterObj) || getSnapshotDisplayName(beforeObj);
  if (fromSnapshot) return fromSnapshot;

  if (log.target_id.includes(',')) {
    return locale === 'en'
      ? `Total ${log.target_id.split(',').length} targets`
      : `총 ${log.target_id.split(',').length}개 대상`;
  }
  if (isLikelyUuid(log.target_id))
    return locale === 'en'
      ? `Name unavailable (Identifier ${log.target_id.slice(0, 8)}...)`
      : `이름 정보 없음 (식별 ID ${log.target_id.slice(0, 8)}...)`;
  return log.target_id;
}

export function getLogTargetDisplayNameWithT(log: ActivityLogEntry, t: TranslationFn): string {
  const details = log.metadata as Record<string, unknown> | null;
  const targetNameFromMetadata =
    details && typeof details.target_name === 'string' ? details.target_name : null;
  if (targetNameFromMetadata) return targetNameFromMetadata;

  const fromDetails =
    (typeof details?.order_no === 'string' && details.order_no) ||
    (typeof details?.title === 'string' && details.title) ||
    (typeof details?.name === 'string' && details.name) ||
    (typeof details?.user_name === 'string' && details.user_name) ||
    (typeof details?.buyer_name === 'string' && details.buyer_name) ||
    (typeof details?.artist_name === 'string' && details.artist_name) ||
    (typeof details?.representative_name === 'string' && details.representative_name) ||
    null;

  if (fromDetails) return fromDetails;

  const afterObj = toObject(log.after_snapshot);
  const beforeObj = toObject(log.before_snapshot);
  const fromSnapshot = getSnapshotDisplayName(afterObj) || getSnapshotDisplayName(beforeObj);
  if (fromSnapshot) return fromSnapshot;

  if (log.target_id.includes(',')) {
    return t('totalTargets', { count: log.target_id.split(',').length });
  }
  if (isLikelyUuid(log.target_id))
    return t('nameUnavailable', { label: formatIdentifierLabel(log.target_id, t) });
  return log.target_id;
}

export function formatStatus(value: unknown, locale: LocaleCode): string | null {
  if (typeof value !== 'string') return null;
  const statusMap: Record<string, Record<string, string>> = {
    ko: { available: '판매 가능', reserved: '예약중', sold: '판매 완료', hidden: '숨김' },
    en: { available: 'Available', reserved: 'Reserved', sold: 'Sold', hidden: 'Hidden' },
  };
  return statusMap[locale][value] || value;
}

export function formatStatusWithT(value: unknown, t: TranslationFn): string | null {
  if (typeof value !== 'string') return null;
  const keyMap: Record<string, string> = {
    available: 'statusAvailable',
    reserved: 'statusReserved',
    sold: 'statusSold',
    hidden: 'statusHidden',
  };
  const key = keyMap[value];
  if (key) return t(key);
  return value;
}

export function formatOrderStatus(value: unknown, locale: LocaleCode): string | null {
  if (typeof value !== 'string') return null;
  const statusMap: Record<string, Record<string, string>> = {
    ko: {
      pending_payment: '결제 대기',
      awaiting_deposit: '입금 대기',
      paid: '결제 완료',
      preparing: '준비 중',
      shipped: '배송 중',
      delivered: '배송 완료',
      completed: '거래 완료',
      cancelled: '취소됨',
      refunded: '환불됨',
      refund_requested: '환불 요청',
    },
    en: {
      pending_payment: 'Pending Payment',
      awaiting_deposit: 'Awaiting Deposit',
      paid: 'Paid',
      preparing: 'Preparing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      completed: 'Completed',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      refund_requested: 'Refund Requested',
    },
  };

  return statusMap[locale][value] || value;
}

export function getTargetNameMap(log: ActivityLogEntry): Map<string, string> {
  const details = log.metadata as Record<string, unknown> | null;
  const raw = details?.target_names;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return new Map();

  const entries = Object.entries(raw).filter(
    (entry): entry is [string, string] =>
      typeof entry[0] === 'string' && typeof entry[1] === 'string'
  );

  return new Map(entries);
}

const FIELD_LABEL_KEYS: Record<string, string> = {
  title: 'fieldTitle',
  description: 'fieldDescription',
  size: 'fieldSize',
  material: 'fieldMaterial',
  year: 'fieldYear',
  edition: 'fieldEdition',
  price: 'fieldPrice',
  sold_at: 'fieldSoldAt',
  is_hidden: 'fieldIsHidden',
  images: 'fieldImages',
  shop_url: 'fieldShopUrl',
  artist_id: 'fieldArtistId',
  name_ko: 'fieldNameKo',
  name_en: 'fieldNameEn',
  bio: 'fieldBio',
  history: 'fieldHistory',
  profile_image: 'fieldProfileImage',
  contact_phone: 'fieldContactPhone',
  contact_email: 'fieldContactEmail',
  instagram: 'fieldInstagram',
  homepage: 'fieldHomepage',
  role: 'fieldRole',
};

export function getFieldLabel(key: string, t: TranslationFn, targetType?: string | null) {
  if (key === 'status') {
    return targetType === 'artwork' ? t('fieldStatusArtwork') : t('fieldStatusGeneric');
  }
  const msgKey = FIELD_LABEL_KEYS[key];
  if (msgKey) return t(msgKey);
  return key;
}

export function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

export function toObjectList(value: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    );
  }

  const objectValue = toObject(value);
  if (!objectValue) return null;
  if (!Array.isArray(objectValue.items)) return null;

  return objectValue.items.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === 'object'
  );
}

export function valueEquals(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function getDiffRows(
  beforeObj: Record<string, unknown>,
  afterObj: Record<string, unknown>
): DiffRow[] {
  const keys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));

  return keys
    .filter((key) => key !== 'updated_at')
    .filter((key) => !valueEquals(beforeObj[key], afterObj[key]))
    .map((key) => ({
      field: key,
      before: beforeObj[key],
      after: afterObj[key],
    }));
}

export function getDiffItems(log: ActivityLogEntry): DiffItem[] {
  const beforeList = toObjectList(log.before_snapshot);
  const afterList = toObjectList(log.after_snapshot);
  const targetNameMap = getTargetNameMap(log);

  if (beforeList && afterList) {
    const beforeMap = new Map(
      beforeList
        .map((item) => {
          const id = typeof item.id === 'string' ? item.id : null;
          return id ? [id, item] : null;
        })
        .filter((entry): entry is [string, Record<string, unknown>] => !!entry)
    );
    const afterMap = new Map(
      afterList
        .map((item) => {
          const id = typeof item.id === 'string' ? item.id : null;
          return id ? [id, item] : null;
        })
        .filter((entry): entry is [string, Record<string, unknown>] => !!entry)
    );

    return Array.from(beforeMap.entries())
      .map(([id, beforeObj]) => {
        const afterObj = afterMap.get(id);
        if (!afterObj) return null;
        const changes = getDiffRows(beforeObj, afterObj);
        if (changes.length === 0) return null;
        return {
          itemId: id,
          itemLabel:
            getSnapshotDisplayName(afterObj) ||
            getSnapshotDisplayName(beforeObj) ||
            targetNameMap.get(id) ||
            null,
          changes,
        };
      })
      .filter((item): item is DiffItem => !!item);
  }

  const beforeObj = toObject(log.before_snapshot);
  const afterObj = toObject(log.after_snapshot);
  if (!beforeObj || !afterObj) return [];

  const changes = getDiffRows(beforeObj, afterObj);
  if (changes.length === 0) return [];

  return [
    {
      itemId: log.target_id,
      itemLabel:
        getSnapshotDisplayName(afterObj) ||
        getSnapshotDisplayName(beforeObj) ||
        targetNameMap.get(log.target_id) ||
        null,
      changes,
    },
  ];
}

export function getSnapshotIdWarnings(log: ActivityLogEntry): {
  missingInAfter: string[];
  addedInAfter: string[];
} {
  const beforeList = toObjectList(log.before_snapshot);
  const afterList = toObjectList(log.after_snapshot);

  if (!beforeList || !afterList) {
    return { missingInAfter: [], addedInAfter: [] };
  }

  const beforeIds = new Set(
    beforeList
      .map((item) => (typeof item.id === 'string' ? item.id : null))
      .filter((id): id is string => !!id)
  );
  const afterIds = new Set(
    afterList
      .map((item) => (typeof item.id === 'string' ? item.id : null))
      .filter((id): id is string => !!id)
  );

  const missingInAfter = Array.from(beforeIds).filter((id) => !afterIds.has(id));
  const addedInAfter = Array.from(afterIds).filter((id) => !beforeIds.has(id));

  return { missingInAfter, addedInAfter };
}

export function formatDiffValue(value: unknown, field: string, t: TranslationFn): string {
  if (value === null || value === undefined || value === '') return '-';

  if (field === 'status') {
    const statusText = formatStatusWithT(value, t);
    if (statusText) return statusText;
  }

  if (field.endsWith('_id') && typeof value === 'string') {
    return formatIdentifier(value, t);
  }

  if (typeof value === 'boolean') return value ? t('booleanYes') : t('booleanNo');
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((item) => typeof item === 'string')) {
      const preview = `${value.slice(0, 2).join(', ')}${value.length > 2 ? '...' : ''}`;
      return t('arrayItems', { count: value.length, preview });
    }
    return t('arrayItemsOnly', { count: value.length });
  }
  if (typeof value === 'object') {
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  }

  const text = String(value);
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}
