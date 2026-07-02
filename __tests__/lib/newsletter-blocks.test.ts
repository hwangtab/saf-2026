import { parseNewsletterBlocks, blocksToText } from '@/lib/newsletter/blocks';

const validBlocks = [
  { id: 'b1', type: 'cover', title: '7월의 씨앗페', subtitle: '이달의 작품과 소식', imageUrl: '' },
  { id: 'b2', type: 'text', html: '<p>안녕하세요, 씨앗페입니다.</p>' },
  {
    id: 'b3',
    type: 'artworkCard',
    artworkId: 'aw-1',
    showPrice: true,
    snapshot: {
      title: '가족',
      artistName: '오윤',
      imageUrl: 'https://example.supabase.co/storage/v1/object/public/artworks/a__card.webp',
      description: '따뜻한 시선의 판화',
      price: '₩5,000,000',
      url: 'https://www.saf2026.com/artworks/aw-1',
    },
  },
  {
    id: 'b4',
    type: 'eventBanner',
    title: '오윤 테라코타 기금마련전',
    dateText: '2026. 7. 15 — 7. 30',
    imageUrl: '',
    ctaLabel: '자세히 보기',
    ctaUrl: 'https://www.saf2026.com/funding/oh-yoon',
  },
  { id: 'b5', type: 'button', label: '전시 보러가기', url: 'https://www.saf2026.com/artworks' },
  { id: 'b6', type: 'divider' },
];

describe('parseNewsletterBlocks', () => {
  it('유효한 블록 배열을 그대로 파싱한다', () => {
    const blocks = parseNewsletterBlocks(validBlocks);
    expect(blocks).toHaveLength(6);
    expect(blocks[2]).toMatchObject({ type: 'artworkCard', showPrice: true });
  });

  it('배열이 아니면 throw', () => {
    expect(() => parseNewsletterBlocks({})).toThrow('배열');
  });

  it('id 누락 블록은 throw', () => {
    expect(() => parseNewsletterBlocks([{ type: 'divider' }])).toThrow('id');
  });

  it('알 수 없는 type은 throw', () => {
    expect(() => parseNewsletterBlocks([{ id: 'x', type: 'video' }])).toThrow('type');
  });

  it('button의 javascript: URL은 throw', () => {
    expect(() =>
      parseNewsletterBlocks([{ id: 'x', type: 'button', label: 'go', url: 'javascript:alert(1)' }])
    ).toThrow('http');
  });

  it('eventBanner의 ctaUrl 누락은 throw', () => {
    expect(() =>
      parseNewsletterBlocks([
        {
          id: 'x',
          type: 'eventBanner',
          title: 't',
          dateText: '',
          imageUrl: '',
          ctaLabel: 'go',
          ctaUrl: '',
        },
      ])
    ).toThrow('http');
  });

  it('artworkCard snapshot 필드 누락은 throw', () => {
    expect(() =>
      parseNewsletterBlocks([
        {
          id: 'x',
          type: 'artworkCard',
          artworkId: 'a',
          showPrice: false,
          snapshot: { title: 't' },
        },
      ])
    ).toThrow('snapshot');
  });
});

describe('blocksToText', () => {
  it('작품·이벤트·버튼 정보를 텍스트로 직렬화한다', () => {
    const text = blocksToText(parseNewsletterBlocks(validBlocks));
    expect(text).toContain('가족 — 오윤');
    expect(text).toContain('₩5,000,000');
    expect(text).toContain('https://www.saf2026.com/artworks/aw-1');
    expect(text).toContain('오윤 테라코타 기금마련전');
    expect(text).toContain('전시 보러가기: https://www.saf2026.com/artworks');
    expect(text).toContain('안녕하세요');
  });

  it('showPrice=false면 가격을 넣지 않는다', () => {
    const blocks = parseNewsletterBlocks([{ ...validBlocks[2], showPrice: false }]);
    expect(blocksToText(blocks)).not.toContain('₩5,000,000');
  });
});
