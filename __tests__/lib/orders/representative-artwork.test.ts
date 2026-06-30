/**
 * representative-artwork.ts 단위 테스트
 *
 * 다품목(cart) 주문의 대표작품 표시 헬퍼. Supabase 임베드의 배열/객체/null 정규화와
 * locale별 "외 N건" / "and N more" 포맷을 검증한다.
 */

import {
  getRepresentativeArtwork,
  formatRepresentativeTitle,
} from '@/lib/orders/representative-artwork';

describe('getRepresentativeArtwork', () => {
  it('빈/누락 order_items는 count=0, 필드 null', () => {
    expect(getRepresentativeArtwork(undefined)).toEqual({
      title: null,
      artworkId: null,
      image: null,
      artistName: null,
      count: 0,
    });
    expect(getRepresentativeArtwork(null)).toEqual({
      title: null,
      artworkId: null,
      image: null,
      artistName: null,
      count: 0,
    });
    expect(getRepresentativeArtwork([])).toEqual({
      title: null,
      artworkId: null,
      image: null,
      artistName: null,
      count: 0,
    });
  });

  it('다품목: 첫 품목을 대표로, count는 전체 라인 수', () => {
    const rep = getRepresentativeArtwork([
      {
        artworks: {
          id: 'aw-spring',
          title: '봄의 정원',
          images: ['spring.jpg'],
          artists: { name_ko: '김작가' },
        },
      },
      { artworks: { title: '여름 바다', images: ['summer.jpg'], artists: { name_ko: '이작가' } } },
      { artworks: { title: '가을 산', images: ['autumn.jpg'], artists: { name_ko: '박작가' } } },
    ]);
    expect(rep).toEqual({
      title: '봄의 정원',
      artworkId: 'aw-spring',
      image: 'spring.jpg',
      artistName: '김작가',
      count: 3,
    });
  });

  it('단건: count=1, 대표=그 작품', () => {
    const rep = getRepresentativeArtwork([
      {
        artworks: {
          id: 'aw-solo',
          title: '단독',
          images: ['solo.jpg'],
          artists: { name_ko: '최작가' },
        },
      },
    ]);
    expect(rep).toEqual({
      title: '단독',
      artworkId: 'aw-solo',
      image: 'solo.jpg',
      artistName: '최작가',
      count: 1,
    });
  });

  it('artworks가 배열로 임베드돼도 첫 요소 정규화', () => {
    const rep = getRepresentativeArtwork([
      { artworks: [{ title: '배열작품', images: ['a.jpg'], artists: [{ name_ko: '배열작가' }] }] },
    ]);
    expect(rep.title).toBe('배열작품');
    expect(rep.image).toBe('a.jpg');
    expect(rep.artistName).toBe('배열작가');
    expect(rep.count).toBe(1);
  });

  it('객체(비배열) order_items도 단일 라인으로 처리', () => {
    const rep = getRepresentativeArtwork({
      artworks: { title: '객체작품', images: ['o.jpg'], artists: { name_ko: '객체작가' } },
    });
    expect(rep.title).toBe('객체작품');
    expect(rep.count).toBe(1);
  });

  it('images 누락/빈배열이면 image=null, 제목·작가는 유지', () => {
    expect(
      getRepresentativeArtwork([{ artworks: { title: 'NoImg', artists: { name_ko: '작가' } } }])
        .image
    ).toBeNull();
    expect(
      getRepresentativeArtwork([
        { artworks: { title: 'EmptyImg', images: [], artists: { name_ko: '작가' } } },
      ]).image
    ).toBeNull();
  });

  it('artists 누락이면 artistName=null', () => {
    const rep = getRepresentativeArtwork([{ artworks: { title: 'T', images: ['i.jpg'] } }]);
    expect(rep.artistName).toBeNull();
    expect(rep.title).toBe('T');
  });

  it('artworks 자체가 null인 라인도 count는 셈(제목 null)', () => {
    const rep = getRepresentativeArtwork([{ artworks: null }, { artworks: null }]);
    expect(rep.title).toBeNull();
    expect(rep.count).toBe(2);
  });
});

describe('formatRepresentativeTitle', () => {
  it('단건(count<=1)은 제목 그대로 (외 없음)', () => {
    expect(formatRepresentativeTitle('봄의 정원', 1, 'ko')).toBe('봄의 정원');
    expect(formatRepresentativeTitle('Spring', 1, 'en')).toBe('Spring');
    expect(formatRepresentativeTitle('봄의 정원', 0, 'ko')).toBe('봄의 정원');
  });

  it('다품목 ko는 "외 N건"', () => {
    expect(formatRepresentativeTitle('봄의 정원', 2, 'ko')).toBe('봄의 정원 외 1건');
    expect(formatRepresentativeTitle('봄의 정원', 5, 'ko')).toBe('봄의 정원 외 4건');
  });

  it('다품목 en은 "and N more"', () => {
    expect(formatRepresentativeTitle('Spring Garden', 2, 'en')).toBe('Spring Garden and 1 more');
    expect(formatRepresentativeTitle('Spring Garden', 3, 'en')).toBe('Spring Garden and 2 more');
  });
});
