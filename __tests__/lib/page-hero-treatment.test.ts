import { resolvePageHeroSoftTreatment } from '@/lib/page-hero-treatment';

const qualityMap = {
  '/images/hero/low.jpg': { width: 1200, height: 900, lowRes: true },
  '/images/hero/high.jpg': { width: 2400, height: 1600, lowRes: false },
};

describe('resolvePageHeroSoftTreatment', () => {
  it('auto + lowRes이면 보정 적용', () => {
    expect(resolvePageHeroSoftTreatment('/images/hero/low.jpg', 'auto', qualityMap)).toBe(true);
  });

  it('auto + 정상 해상도이면 보정 미적용', () => {
    expect(resolvePageHeroSoftTreatment('/images/hero/high.jpg', 'auto', qualityMap)).toBe(false);
  });

  it('auto + 측정값 없음이면 기존 렌더로 안전 폴백', () => {
    expect(resolvePageHeroSoftTreatment('/images/hero/missing.jpg', 'auto', qualityMap)).toBe(
      false
    );
  });

  it('soft이면 측정값과 무관하게 보정 적용', () => {
    expect(resolvePageHeroSoftTreatment('/images/hero/high.jpg', 'soft', qualityMap)).toBe(true);
  });

  it('sharp이면 lowRes여도 보정 미적용', () => {
    expect(resolvePageHeroSoftTreatment('/images/hero/low.jpg', 'sharp', qualityMap)).toBe(false);
  });

  it('customBackgroundImage가 없으면 보정 미적용', () => {
    expect(resolvePageHeroSoftTreatment(undefined, 'soft', qualityMap)).toBe(false);
  });

  it("backgroundTreatment 미지정은 'auto'와 동일", () => {
    expect(resolvePageHeroSoftTreatment('/images/hero/low.jpg', undefined, qualityMap)).toBe(true);
  });
});
