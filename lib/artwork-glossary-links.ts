/**
 * artwork detail spec table 필드 → 정전 가이드 스토리 slug.
 *
 * 배경: 정보형 "뜻/사이즈" 쿼리(에디션 뜻 427 imp·10호 사이즈 64 imp 등)가
 * page-1 하단(pos 7~10)에 정체해 거의 0클릭. title/meta는 T2-8에서 이미 최적화됨.
 * 병목은 position(어린 도메인, 고경쟁 정보형). artwork detail은 최고 권위·최다 트래픽
 * page type이나 가이드 스토리 링크가 0개 → spec table에 문맥 헬퍼 링크로 equity 집중.
 *
 * KO(/stories/…)만 indexable → equity는 KO에서만 흐름. EN(/en/stories/…)은 UX용.
 * GSC 28일 분석(2026-05-20): editions-explained / reading-art-sizes-ho-vs-cm 정전 확인.
 */

export const SIZE_GUIDE_SLUG = 'reading-art-sizes-ho-vs-cm';
export const EDITION_GUIDE_SLUG = 'editions-explained';

/** locale-aware 가이드 스토리 href. */
export function guideStoryHref(slug: string, isEnglish: boolean): string {
  return isEnglish ? `/en/stories/${slug}` : `/stories/${slug}`;
}
