/**
 * 청원 운영 상수.
 *
 * 마감일은 ENV로 빼두면 즉시 연장 가능 (카운터 동결도 함께 연장됨).
 * ENV 미설정 시 PRD §1.4 기본값 사용.
 */

export const PETITION_OH_YOON_SLUG = 'oh-yoon' as const;

export const PETITION_OH_YOON_DEADLINE_ISO =
  process.env.NEXT_PUBLIC_PETITION_DEADLINE ?? '2026-05-10T23:59:59+09:00';

export const PETITION_OH_YOON_GOAL = Number(process.env.NEXT_PUBLIC_PETITION_GOAL ?? '10000');

// 페이지 라우트 `/petition/oh-yoon`과 충돌 회피를 위해 대시 경로 사용.
// 정적 파일은 `public/petition-oh-yoon/proposal-v5.pdf`에 둘 것.
export const PETITION_OH_YOON_PROPOSAL_PDF =
  process.env.NEXT_PUBLIC_PETITION_PROPOSAL_PDF ?? '/petition-oh-yoon/proposal-v5.pdf';

export const PETITION_OH_YOON_PATH = '/petition/oh-yoon' as const;
