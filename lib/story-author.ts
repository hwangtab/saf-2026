/**
 * 매거진 저자 표기 — 모든 매거진은 편집부 단일 명의 '씨앗페' / 'Seed Art Festival'로 표기.
 * DB row의 author 컬럼 값은 무시. author 파라미터는 호출처 시그니처 호환을 위해 남겨둠.
 */
export function localizeStoryAuthor(
  _author: string | null | undefined,
  locale: 'ko' | 'en'
): string {
  return locale === 'en' ? 'Seed Art Festival' : '씨앗페';
}
