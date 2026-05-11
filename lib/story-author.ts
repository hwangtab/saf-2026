/**
 * 매거진 author(편집자) 영문 로컬라이즈 — stories 테이블에 author_en 컬럼 부재 시 코드 매핑.
 *
 * DB 실제 author 4종 (2026-05-11 기준):
 * - "SAF 매거진" (8 rows)
 * - "SAF 매거진 편집부" (47 rows)
 * - "씨앗페 매거진" (113 rows)
 * - "씨앗페 편집팀" (6 rows)
 *
 * 모두 동일한 편집부를 가리키지만 시기·작성자에 따라 변형 라벨. 영문은 "SAF Magazine"
 * 통일 + 편집부/팀만 구분 표기. 향후 author_en DB 컬럼 추가하면 이 매핑은 fallback으로
 * 남기거나 제거 가능.
 */
const STORY_AUTHOR_MAP: Record<string, string> = {
  'SAF 매거진': 'SAF Magazine',
  'SAF 매거진 편집부': 'SAF Magazine Editorial Team',
  '씨앗페 매거진': 'SAF Magazine',
  '씨앗페 편집팀': 'SAF Magazine Editorial Team',
};

export function localizeStoryAuthor(
  author: string | null | undefined,
  locale: 'ko' | 'en'
): string {
  if (!author) return '';
  if (locale === 'ko') return author;
  return STORY_AUTHOR_MAP[author] ?? author;
}
