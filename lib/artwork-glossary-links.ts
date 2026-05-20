/**
 * artwork detail spec table 필드 → 정전 가이드 스토리 slug.
 *
 * T2-11(2026-05-20): 정보형 "뜻/사이즈" 쿼리(에디션 뜻 427 imp·10호 사이즈 64 imp 등)
 * spec table size·edition 행에 헬퍼 링크 추가. KO 전용 equity 집중.
 *
 * T2-12(2026-05-20): 매체/판화 용어 cluster(넘버링 뜻 81·피그먼트 프린트 36·판화 뜻 23)
 * material 행에 조건부 링크 추가. materialGuideSlug이 null 반환하면 링크 미렌더(회화류 제외).
 *
 * KO(/stories/…)만 indexable → equity는 KO에서만 흐름. EN(/en/stories/…)은 UX용.
 */

export const SIZE_GUIDE_SLUG = 'reading-art-sizes-ho-vs-cm';
export const EDITION_GUIDE_SLUG = 'editions-explained';
export const PRINTMAKING_GUIDE_SLUG = 'prints-vs-originals-and-edition-numbers';
export const PIGMENT_PRINT_GUIDE_SLUG = 'archival-pigment-print-photography';

/** locale-aware 가이드 스토리 href. */
export function guideStoryHref(slug: string, isEnglish: boolean): string {
  return isEnglish ? `/en/stories/${slug}` : `/stories/${slug}`;
}

/**
 * material 텍스트 → 매체 가이드 slug. 매칭 없으면 null(링크 미렌더).
 *
 * 판화 체크 우선: 동판/목판 등 판화는 pigment print와 겹치지 않음.
 * pigment 매칭은 pigment+print 동시 요구 — "Pigment on watercolor texture"(회화 안료)
 * 같이 print 없는 케이스를 올바르게 제외하기 위함.
 */
export function materialGuideSlug(material: string | null | undefined): string | null {
  if (!material) return null;
  const m = material.toLowerCase();
  if (
    /판화|목판|석판|동판|실크스크린|에칭|woodcut|linocut|lithograph|silkscreen|etching|engraving/.test(
      m
    )
  ) {
    return PRINTMAKING_GUIDE_SLUG;
  }
  if (
    (/pigment|피그먼트/.test(m) && /print|프린트/.test(m)) ||
    /ink-?jet|잉크젯|gicl[eé]e?|파인아트\s*사진/.test(m)
  ) {
    return PIGMENT_PRINT_GUIDE_SLUG;
  }
  return null;
}
