import type { ActivityLogEntry } from '@/app/actions/admin-logs';

export type LocaleCode = 'ko' | 'en';

export const LOGS_UI = {
  ko: {
    noLogsTitle: '활동 로그가 없습니다',
    noLogsDescription: '관리자/아티스트 활동이 기록되면 여기에 표시됩니다.',
    totalZero: '총 0개의 기록',
    revertModalTitle: '활동 복구 확인',
    revertConfirmText: '복구하기',
    revertDescription:
      '정말 이 변경을 복구하시겠습니까? 현재 데이터에 직접적인 영향을 줄 수 있습니다. 복구 사유를 아래에 입력해주세요.',
    revertReasonLabel: '복구 사유',
    revertReasonPlaceholder: '예: 실수로 삭제한 데이터를 복구함',
    headerTime: '시간',
    headerActor: '행위자',
    headerAction: '활동',
    headerTarget: '대상',
    headerOperation: '조치',
    changesCount: (count: number) => `변경 ${count}건`,
    showChanges: '변경 보기',
    hideChanges: '변경 닫기',
    revertButton: '복구',
    reverted: '복구됨',
    revertUnavailable: '복구 불가',
    revertTitle:
      '삭제/수정/권한 변경 로그를 복구할 수 있으며, 이후 추가 변경이 있으면 복구가 중단될 수 있습니다.',
    revertUnavailableTitle: '복구 대상이 아닌 활동입니다.',
    diffTitle: '변경 상세 비교',
    missingInAfter: (count: number) => `변경 후 스냅샷에서 누락된 대상: ${count}개`,
    addedInAfter: (count: number) => `변경 후 스냅샷에 새로 포함된 대상: ${count}개`,
    target: '대상',
    nameMissing: (idLabel: string) => `이름 정보 없음 (${idLabel})`,
    identifier: (value: string) => `(식별 ID: ${value})`,
    colField: '변경 내용',
    colBefore: '이전 값',
    colAfter: '변경 값',
    totalCount: (total: number, current: number, pages: number) =>
      `총 ${total}개의 기록 (페이지 ${current} / ${pages})`,
    prev: '이전',
    next: '다음',
    unknownActor: '(알 수 없음)',
    reason: '사유',
    revertReason: '복구 사유',
    purgeReason: '영구 삭제 사유',
    revertSuccess: '복구가 완료되었습니다.',
    revertError: '복구 중 오류가 발생했습니다.',
  },
  en: {
    noLogsTitle: 'No activity logs',
    noLogsDescription: 'Admin/artist activities will appear here once recorded.',
    totalZero: 'Total 0 records',
    revertModalTitle: 'Confirm Revert',
    revertConfirmText: 'Revert',
    revertDescription:
      'Are you sure you want to revert this change? It can directly affect current data. Please provide a reason below.',
    revertReasonLabel: 'Reason for revert',
    revertReasonPlaceholder: 'e.g., Restore data deleted by mistake',
    headerTime: 'Time',
    headerActor: 'Actor',
    headerAction: 'Action',
    headerTarget: 'Target',
    headerOperation: 'Operation',
    changesCount: (count: number) => `${count} changes`,
    showChanges: 'Show changes',
    hideChanges: 'Hide changes',
    revertButton: 'Revert',
    reverted: 'Reverted',
    revertUnavailable: 'Unavailable',
    revertTitle:
      'Delete/update/role-change logs can be reverted. Revert may stop if additional changes were made afterward.',
    revertUnavailableTitle: 'This activity cannot be reverted.',
    diffTitle: 'Detailed Diff',
    missingInAfter: (count: number) => `Missing in after snapshot: ${count}`,
    addedInAfter: (count: number) => `Newly added in after snapshot: ${count}`,
    target: 'Target',
    nameMissing: (idLabel: string) => `Name unavailable (${idLabel})`,
    identifier: (value: string) => `(Identifier: ${value})`,
    colField: 'Field',
    colBefore: 'Before',
    colAfter: 'After',
    totalCount: (total: number, current: number, pages: number) =>
      `Total ${total} records (page ${current} / ${pages})`,
    prev: 'Previous',
    next: 'Next',
    unknownActor: '(Unknown)',
    reason: 'Reason',
    revertReason: 'Revert reason',
    purgeReason: 'Purge reason',
    revertSuccess: 'Restore completed.',
    revertError: 'Error while reverting.',
  },
} as const;

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
  [/^Cafe24 판매 동기화 경고:/, 'Cafe24 sales sync warning:'],
  [/^Cafe24 판매 동기화 실패:/, 'Cafe24 sales sync failed:'],
  [/^판매 기록 등록:/, 'Sale recorded:'],
  [/^출품자 승인:/, 'Exhibitor approved:'],
  [/^출품자 정지:/, 'Exhibitor suspended:'],
  [/^추천사 생성:/, 'Testimonial created:'],
  [/^추천사 삭제:/, 'Testimonial deleted:'],
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

export const STATUS_LABELS_BY_LOCALE: Record<LocaleCode, Record<string, string>> = {
  ko: {
    available: '판매 가능',
    reserved: '예약중',
    sold: '판매 완료',
    hidden: '숨김',
  },
  en: {
    available: 'Available',
    reserved: 'Reserved',
    sold: 'Sold',
    hidden: 'Hidden',
  },
};

export type LogsListProps = {
  logs: ActivityLogEntry[];
  currentPage: number;
  totalPages: number;
  total: number;
};

export function getCafe24SyncIssueText(
  details: Record<string, unknown> | null,
  fallback: string
): string {
  const primaryError =
    typeof details?.primary_error === 'string' ? details.primary_error.trim() : '';
  if (primaryError) return primaryError;

  const firstError =
    Array.isArray(details?.errors) && typeof details.errors[0] === 'string'
      ? details.errors[0].trim()
      : '';
  if (firstError) return firstError;

  const reason = typeof details?.reason === 'string' ? details.reason.trim() : '';
  if (reason) return reason;

  return fallback;
}

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
    case 'batch_cafe24_missing_shop_url_sync':
      text =
        locale === 'en'
          ? `Missing purchase-link sync: ${details?.succeeded || 0} succeeded / ${details?.failed || 0} failed`
          : `구매링크 누락 동기화: 성공 ${details?.succeeded || 0}건 / 실패 ${details?.failed || 0}건`;
      break;
    case 'cafe24_sales_sync_warning':
      text = `Cafe24 판매 동기화 경고: ${getCafe24SyncIssueText(details, '일부 항목 확인 필요')}`;
      break;
    case 'cafe24_sales_sync_failed':
      text = `Cafe24 판매 동기화 실패: ${getCafe24SyncIssueText(details, '원인 확인 필요')}`;
      break;
    case 'artwork_sold':
      text = `판매 기록 등록: ${details?.quantity || 1}점`;
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
  locale: LocaleCode
): { label: string; value: string } | null {
  const details = log.metadata as Record<string, unknown> | null;
  const metadataReason = typeof details?.reason === 'string' ? details.reason.trim() : '';
  const revertReason = typeof log.revert_reason === 'string' ? log.revert_reason.trim() : '';
  const purgeNote = typeof log.purge_note === 'string' ? log.purge_note.trim() : '';

  if (revertReason) return { label: LOGS_UI[locale].revertReason, value: revertReason };
  if (purgeNote) return { label: LOGS_UI[locale].purgeReason, value: purgeNote };

  if (metadataReason) {
    if (log.action === 'revert_executed')
      return { label: LOGS_UI[locale].revertReason, value: metadataReason };
    if (log.action === 'trash_purged')
      return { label: LOGS_UI[locale].purgeReason, value: metadataReason };
    return { label: LOGS_UI[locale].reason, value: metadataReason };
  }

  return null;
}

export function getActorRoleLabel(role: ActivityLogEntry['actor_role'], locale: LocaleCode) {
  switch (role) {
    case 'admin':
      return locale === 'en' ? 'Admin' : '관리자';
    case 'artist':
      return locale === 'en' ? 'Artist' : '아티스트';
    case 'exhibitor':
      return locale === 'en' ? 'Exhibitor' : '출품자';
    case 'system':
      return locale === 'en' ? 'System' : '시스템';
    default:
      return role;
  }
}

export function getActorDisplay(log: ActivityLogEntry, locale: LocaleCode) {
  if (log.actor_name) return log.actor_name;
  if (log.actor_email) return log.actor_email;
  if (log.actor_id)
    return `${getActorRoleLabel(log.actor_role, locale)} #${log.actor_id.slice(0, 8)}`;
  return LOGS_UI[locale].unknownActor;
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

export function getTargetTypeLabel(type: string | null, locale: LocaleCode) {
  switch (type) {
    case 'user':
      return locale === 'en' ? 'User' : '사용자';
    case 'artwork':
      return locale === 'en' ? 'Artwork' : '작품';
    case 'artist':
      return locale === 'en' ? 'Artist' : '작가';
    case 'news':
      return locale === 'en' ? 'News' : '뉴스';
    case 'faq':
      return 'FAQ';
    case 'testimonial':
      return locale === 'en' ? 'Testimonial' : '후기';
    case 'video':
      return locale === 'en' ? 'Video' : '영상';
    default:
      return type || '-';
  }
}

export function getTargetLink(log: ActivityLogEntry): string | null {
  if (!log.target_id) return null;

  if (log.target_id === 'all') {
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

export function formatIdentifier(value: string, locale: LocaleCode) {
  if (!value) return '-';
  if (value.includes(',')) return locale === 'en' ? 'Multiple targets' : '다중 대상';
  if (isLikelyUuid(value)) return `${value.slice(0, 8)}...`;
  return value;
}

export function formatIdentifierLabel(value: string, locale: LocaleCode) {
  return locale === 'en'
    ? `Identifier ${formatIdentifier(value, locale)}`
    : `식별 ID ${formatIdentifier(value, locale)}`;
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
    (typeof details?.title === 'string' && details.title) ||
    (typeof details?.name === 'string' && details.name) ||
    (typeof details?.user_name === 'string' && details.user_name) ||
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
      ? `Name unavailable (${formatIdentifierLabel(log.target_id, locale)})`
      : `이름 정보 없음 (${formatIdentifierLabel(log.target_id, locale)})`;
  return log.target_id;
}

export function formatStatus(value: unknown, locale: LocaleCode): string | null {
  if (typeof value !== 'string') return null;
  return STATUS_LABELS_BY_LOCALE[locale][value] || value;
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

export const FIELD_LABELS: Record<string, string> = {
  title: '제목',
  description: '작품 소개',
  size: '크기',
  material: '재료',
  year: '연도',
  edition: '에디션',
  price: '가격',
  status: '판매상태',
  sold_at: '판매 완료 시점',
  is_hidden: '숨김',
  images: '이미지',
  shop_url: '구매 링크',
  artist_id: '작가',
  name_ko: '이름(한글)',
  name_en: '이름(영문)',
  bio: '작가 소개',
  history: '작가 이력',
  profile_image: '프로필 이미지',
  contact_phone: '연락 전화번호',
  contact_email: '연락 이메일',
  instagram: '인스타그램',
  homepage: '홈페이지',
  role: '권한',
};

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

export function getFieldLabel(key: string, locale: LocaleCode, targetType?: string | null) {
  if (key === 'status') {
    if (locale === 'en') {
      return targetType === 'artwork' ? 'Sales status' : 'Status';
    }
    return targetType === 'artwork' ? '판매상태' : '상태';
  }
  if (locale === 'en') {
    const enLabels: Record<string, string> = {
      title: 'Title',
      description: 'Description',
      size: 'Size',
      material: 'Material',
      year: 'Year',
      edition: 'Edition',
      price: 'Price',
      sold_at: 'Sold at',
      is_hidden: 'Hidden',
      images: 'Images',
      shop_url: 'Purchase link',
      artist_id: 'Artist',
      name_ko: 'Name (Korean)',
      name_en: 'Name (English)',
      bio: 'Bio',
      history: 'History',
      profile_image: 'Profile image',
      contact_phone: 'Contact phone',
      contact_email: 'Contact email',
      instagram: 'Instagram',
      homepage: 'Homepage',
      role: 'Role',
    };
    return enLabels[key] || key;
  }
  return FIELD_LABELS[key] || key;
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

export function formatDiffValue(value: unknown, field: string, locale: LocaleCode): string {
  if (value === null || value === undefined || value === '') return '-';

  if (field === 'status') {
    const statusText = formatStatus(value, locale);
    if (statusText) return statusText;
  }

  if (field.endsWith('_id') && typeof value === 'string') {
    return formatIdentifier(value, locale);
  }

  if (typeof value === 'boolean')
    return value ? (locale === 'en' ? 'Yes' : '예') : locale === 'en' ? 'No' : '아니오';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((item) => typeof item === 'string')) {
      return locale === 'en'
        ? `${value.length} items (${value.slice(0, 2).join(', ')}${value.length > 2 ? '...' : ''})`
        : `${value.length}개 (${value.slice(0, 2).join(', ')}${value.length > 2 ? '...' : ''})`;
    }
    return locale === 'en' ? `${value.length} items` : `${value.length}개 항목`;
  }
  if (typeof value === 'object') {
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  }

  const text = String(value);
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}
