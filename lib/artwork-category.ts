/** Korean category → English display name */
export const CATEGORY_EN_MAP: Record<string, string> = {
  회화: 'Painting',
  한국화: 'Korean Painting',
  판화: 'Printmaking',
  사후판화: 'Posthumous Print',
  드로잉: 'Drawing',
  조각: 'Sculpture',
  // '/' 포함 카테고리는 /artworks/category/{category} URL에서 path segment로 분리되어
  // 404를 일으킴 (Next.js App Router가 raw path를 사전 분할). 2026-05 DB UPDATE로
  // '도자/공예' → '도자공예'로 통일. 영문 표시는 슬래시 유지(URL 영향 없음).
  도자공예: 'Ceramics/Craft',
  사진: 'Photography',
  아트프린트: 'Art Print',
  혼합매체: 'Mixed Media',
  디지털아트: 'Digital Art',
};

/**
 * Category slug → 사용자 노출 display name 매핑 (한국어).
 *
 * 홈 카테고리 라벨과 카테고리 페이지 h1 라벨이 매치되지 않는 문제를 해결.
 * 홈은 묶음 그룹 라벨(`사진·미디어`, `입체·공예`)이지만 URL slug는 원자 카테고리(`사진`, `조각`).
 * 카테고리 페이지 hero에서 group 표시로 통일하면 사용자 멘탈 모델 일치.
 *
 * DB의 actual category 값은 그대로 유지(`사진`, `조각`) — 이 매핑은 **표시용**만.
 * 매핑이 없는 slug는 원래 값 그대로 반환.
 */
export const CATEGORY_DISPLAY_KO: Record<string, string> = {
  사진: '사진·미디어',
  조각: '입체·공예',
};

/**
 * Category slug → 영문 display name 매핑.
 *
 * 한국어 매핑과 동일한 컨셉. 홈 라벨(`Photo & Media`, `Sculpture & Craft`)과 카테고리 페이지 hero
 * 일관성을 위해 CATEGORY_EN_MAP의 사전적 번역(`Photography`, `Sculpture`)을 그룹 라벨로 override.
 *
 * CATEGORY_EN_MAP은 schema·alt 등 다른 위치에서도 쓰이므로 별도 매핑 유지 — 표시용 한정.
 */
export const CATEGORY_DISPLAY_EN: Record<string, string> = {
  사진: 'Photo & Media',
  조각: 'Sculpture & Craft',
};

/**
 * Locale 별 카테고리 표시명 — 카테고리 페이지 hero h1·breadcrumbs·SEO에 사용.
 *
 * 홈 카테고리 라벨(예: "사진·미디어")과 카테고리 페이지 h1이 일치하도록 묶음 라벨 우선.
 * 매핑 없으면 한국어는 slug 그대로, 영문은 CATEGORY_EN_MAP 사전 번역으로 fallback.
 */
export function getCategoryDisplayName(category: string, locale: string): string {
  if (locale === 'en') {
    return CATEGORY_DISPLAY_EN[category] || CATEGORY_EN_MAP[category] || category;
  }
  return CATEGORY_DISPLAY_KO[category] || category;
}

/** Get localized category label */
export function getCategoryLabel(value: string, locale: string): string {
  if (locale === 'en') {
    return CATEGORY_EN_MAP[value] || value;
  }
  return value;
}
