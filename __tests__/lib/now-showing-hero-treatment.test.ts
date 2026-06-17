import { resolveHeroSoftTreatment } from '@/lib/now-showing';
import type { NowShowingItem } from '@/lib/now-showing';

const base: NowShowingItem = {
  slug: 'x',
  i18nKey: 'x',
  href: '/x',
  imageUrl: 'https://example.com/x.webp',
  startDate: '2026-01-01',
};

const lowResMap = { x: { width: 1200, height: 900, lowRes: true } };
const hiResMap = { x: { width: 2400, height: 1600, lowRes: false } };

describe('resolveHeroSoftTreatment', () => {
  it('auto + lowRes → 연출 적용', () => {
    expect(resolveHeroSoftTreatment(base, lowResMap)).toBe(true);
  });

  it('auto + 정상 해상도 → 연출 미적용', () => {
    expect(resolveHeroSoftTreatment(base, hiResMap)).toBe(false);
  });

  it('auto + 측정값 없음(미측정 slug) → 연출 미적용(안전 폴백)', () => {
    expect(resolveHeroSoftTreatment(base, {})).toBe(false);
  });

  it("'soft' → 측정 무시하고 항상 연출 적용", () => {
    expect(resolveHeroSoftTreatment({ ...base, heroTreatment: 'soft' }, hiResMap)).toBe(true);
  });

  it("'sharp' → lowRes여도 항상 연출 미적용(오탐 탈출구)", () => {
    expect(resolveHeroSoftTreatment({ ...base, heroTreatment: 'sharp' }, lowResMap)).toBe(false);
  });

  it("heroTreatment 미지정은 'auto'와 동일", () => {
    expect(resolveHeroSoftTreatment(base, lowResMap)).toBe(true);
  });
});
