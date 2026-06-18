export type PageHeroBackgroundTreatment = 'auto' | 'soft' | 'sharp';

export interface PageHeroImageQuality {
  width: number;
  height: number;
  lowRes: boolean;
}

export type PageHeroImageQualityMap = Record<string, PageHeroImageQuality>;

/**
 * PageHero 배경 품질 보정 여부를 결정한다.
 *
 * - sharp: 운영자 강제 미보정
 * - soft: 운영자 강제 보정
 * - auto/미지정: 빌드 타임 측정 결과가 lowRes일 때만 보정
 *
 * 측정값이 없는 런타임 DB 이미지나 외부 썸네일은 기존 렌더로 안전 폴백한다.
 */
export function resolvePageHeroSoftTreatment(
  customBackgroundImage: string | null | undefined,
  treatment: PageHeroBackgroundTreatment | undefined,
  qualityMap: PageHeroImageQualityMap
): boolean {
  const mode = treatment ?? 'auto';
  if (!customBackgroundImage || mode === 'sharp') return false;
  if (mode === 'soft') return true;
  return qualityMap[customBackgroundImage]?.lowRes === true;
}
