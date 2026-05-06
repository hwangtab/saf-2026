// 작가 공지 단일 출처 헬퍼 — 작가 페이지·작품 상세 페이지에서 동일 판정 로직 공유
// migration 20260430120000_artist_notice.sql 참조

export const NOTICE_TYPES = ['info', 'warning', 'urgent'] as const;
export type NoticeType = (typeof NOTICE_TYPES)[number];

export type ArtistNoticeRecord = {
  notice_enabled: boolean | null;
  notice_type: NoticeType | string | null;
  notice_message: string | null;
  notice_message_en: string | null;
  notice_active_until: string | null;
};

export type ActiveNotice = {
  type: NoticeType;
  message: string;
};

function isNoticeType(value: unknown): value is NoticeType {
  return typeof value === 'string' && (NOTICE_TYPES as readonly string[]).includes(value);
}

/**
 * 작가 레코드에서 현재 활성 공지를 추출.
 * - enabled=false, 메시지 없음, 만료 지남 → null
 * - 영어 locale + 영문 메시지 비어있음 → null (영어 페이지에서는 한국어 메시지 노출 안 함)
 *
 * @param record artists 테이블에서 SELECT한 notice_* 필드들
 * @param locale 'ko' | 'en' — 작가 페이지/작품 상세 페이지의 현재 locale
 * @param now 시각 비교 기준 (테스트용 주입). 기본 new Date()
 */
export function resolveActiveNotice(
  record: Partial<ArtistNoticeRecord> | null | undefined,
  locale: 'ko' | 'en',
  now: Date = new Date()
): ActiveNotice | null {
  if (!record) return null;
  if (!record.notice_enabled) return null;
  if (!record.notice_message || record.notice_message.trim().length === 0) return null;

  if (record.notice_active_until) {
    const until = new Date(record.notice_active_until);
    if (!Number.isNaN(until.getTime()) && until <= now) return null;
  }

  const localizedMessage =
    locale === 'en' ? record.notice_message_en?.trim() || null : record.notice_message.trim();

  if (!localizedMessage) return null;

  const type: NoticeType = isNoticeType(record.notice_type) ? record.notice_type : 'info';

  return { type, message: localizedMessage };
}
