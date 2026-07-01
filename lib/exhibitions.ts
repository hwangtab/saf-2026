export const OH_YOON_TERRACOTTA_EXHIBITION = {
  slug: 'oh-yoon-terracotta',
  maxPerArtist: 3,
  /** 캠페인 종료 시 false → 참여 화면·nav·배너 숨김 */
  active: true,
  labelKo: '오윤 테라코타 기금마련전',
  labelEn: 'Oh Yoon Terracotta Relief Exhibition',
  /** 상호 연결: 크라우드펀딩 캠페인 */
  fundingHref: '/funding/oh-yoon-terracotta',
  /** 상호 연결: 벽화 지키기 청원 */
  petitionHref: '/petition/oh-yoon',
} as const;

export const EXHIBITION_SLUGS = [OH_YOON_TERRACOTTA_EXHIBITION.slug] as const;
export type ExhibitionSlug = (typeof EXHIBITION_SLUGS)[number];

export function isExhibitionSlug(value: string | null | undefined): value is ExhibitionSlug {
  return !!value && (EXHIBITION_SLUGS as readonly string[]).includes(value);
}
