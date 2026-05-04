/**
 * 청원 마감일 표기 포맷터 — 단일 출처.
 *
 * 하드코딩된 날짜를 i18n 메시지나 메일 템플릿에 박지 말 것.
 * 항상 이 헬퍼를 거쳐서 placeholder로 주입.
 * PETITION_OH_YOON_DEADLINE_ISO(또는 ENV) 변경 시 모든 표시가 자동 갱신된다.
 */

import { PETITION_OH_YOON_DEADLINE_ISO } from './constants';

const TIMEZONE = 'Asia/Seoul';

export interface FormattedDeadline {
  short: string; // "5월 20일" / "May 20"
  full: string; // "2026년 5월 20일" / "May 20, 2026"
}

export function formatPetitionDeadline(locale: 'ko' | 'en'): FormattedDeadline {
  const date = new Date(PETITION_OH_YOON_DEADLINE_ISO);

  if (locale === 'en') {
    return {
      short: new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        timeZone: TIMEZONE,
      }).format(date),
      full: new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: TIMEZONE,
      }).format(date),
    };
  }

  // ko — Intl 한국어 출력은 "2026. 5. 20." 형식이라 직접 조합
  const parts = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: TIMEZONE,
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';

  return {
    short: `${month}월 ${day}일`,
    full: `${year}년 ${month}월 ${day}일`,
  };
}
