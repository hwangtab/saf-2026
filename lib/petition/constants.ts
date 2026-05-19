/**
 * 청원 운영 상수.
 *
 * 마감일은 ENV로 빼두면 즉시 연장 가능 (카운터 동결도 함께 연장됨).
 * ENV 미설정 시 기본값 사용.
 *
 * ⚠️ 마감일 표기는 i18n 메시지나 메일 템플릿에 직접 박지 말 것.
 *    lib/petition/format.ts의 formatPetitionDeadline() 헬퍼를 통해
 *    {deadlineShort} / {deadlineFull} placeholder로 주입한다.
 *    그래야 ENV 변경만으로 모든 텍스트가 일관 갱신된다.
 */

export const PETITION_OH_YOON_SLUG = 'oh-yoon' as const;

export const PETITION_OH_YOON_DEADLINE_ISO =
  process.env.NEXT_PUBLIC_PETITION_DEADLINE ?? '2026-05-25T23:59:59+09:00';

export const PETITION_OH_YOON_GOAL = Number(process.env.NEXT_PUBLIC_PETITION_GOAL ?? '10000');

export const PETITION_OH_YOON_PATH = '/petition/oh-yoon' as const;
