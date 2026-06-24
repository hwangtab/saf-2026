import { getHeroSlides } from '../../lib/now-showing';

describe('getHeroSlides', () => {
  it('활성 항목을 heroPriority 내림차순으로 반환 (2026-06-24: 강석태0·오윤0·박생광5)', () => {
    const slides = getHeroSlides(new Date('2026-06-24'));
    expect(slides.map((s) => s.slug)).toEqual([
      'park-saenggwang-drawings',
      'all-artworks',
      'oh-yoon-40th',
    ]);
  });

  it('최대 3장으로 제한', () => {
    const slides = getHeroSlides(new Date('2026-06-24'));
    expect(slides.length).toBeLessThanOrEqual(3);
  });

  it('활성 항목이 없으면 fallback 1장(강석태)만 반환', () => {
    // 박생광(6/28)·오윤(12/31) 모두 만료된 미래 시점
    const slides = getHeroSlides(new Date('2027-06-01'));
    expect(slides.map((s) => s.slug)).toEqual(['all-artworks']);
  });

  it('첫 슬라이드는 LCP 대상 — 항상 존재', () => {
    expect(getHeroSlides(new Date('2026-06-24'))[0]).toBeDefined();
  });
});
