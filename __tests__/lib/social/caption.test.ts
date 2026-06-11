import { buildCaptionDraft, type CaptionArtwork } from '@/lib/social/caption';

const FULL: CaptionArtwork = {
  id: '35',
  title: '달빛 아래',
  artistName: '김작가',
  medium: '캔버스에 유채',
  size: '60x45cm',
  price: '₩5,000,000',
};

describe('buildCaptionDraft', () => {
  it('작품명·작가·매체·크기·가격을 모두 포함한다', () => {
    const caption = buildCaptionDraft(FULL);
    expect(caption).toContain('달빛 아래');
    expect(caption).toContain('김작가 작가');
    expect(caption).toContain('캔버스에 유채 · 60x45cm');
    expect(caption).toContain('₩5,000,000');
  });

  it('작품 상세 링크와 해시태그를 포함한다', () => {
    const caption = buildCaptionDraft(FULL);
    expect(caption).toContain('/ko/artworks/35');
    expect(caption).toContain('#씨앗페');
    expect(caption).toContain('#SAF2026');
  });

  it('씨앗페 연대 프레이밍을 지키고 피해자 프레이밍 단어를 쓰지 않는다', () => {
    const caption = buildCaptionDraft(FULL);
    expect(caption).toContain('상호부조');
    expect(caption).not.toMatch(/불우|피해자|대출 못/);
  });

  it('매체·크기·가격이 없으면 스펙 블록을 생략한다', () => {
    const caption = buildCaptionDraft({ id: '1', title: '무제', artistName: '이작가' });
    expect(caption).toContain('무제');
    expect(caption).toContain('이작가 작가');
    expect(caption).not.toContain('₩');
  });

  it('작품명이 비어도 "무제"로 대체한다', () => {
    const caption = buildCaptionDraft({ id: '1', title: null, artistName: null });
    expect(caption.startsWith('무제')).toBe(true);
  });

  it('작품 설명·작가 코멘트·작가 소개가 있으면 캡션에 포함', () => {
    const caption = buildCaptionDraft({
      ...FULL,
      description: '점으로 그린 풍경입니다.',
      quote: '점 하나하나가 관계예요.',
      bio: '변경희는 점을 이용한 입체적 표현을 탐구하는 작가.',
    });
    expect(caption).toContain('점으로 그린 풍경입니다.');
    expect(caption).toContain('점 하나하나가 관계예요.');
    expect(caption).toContain('변경희는 점을 이용한 입체적 표현을 탐구하는 작가.');
    expect(caption).toContain('작가 이야기');
  });

  it('설명·코멘트·소개가 없으면 해당 섹션 생략(기존 동작 유지)', () => {
    const caption = buildCaptionDraft(FULL);
    expect(caption).not.toContain('작가 이야기');
    expect(caption).not.toContain('💬');
  });
});
