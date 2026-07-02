/**
 * @jest-environment node
 *
 * @react-email/render 의 내부 dynamic import("react-dom/server")가
 * Jest 기본 변환 환경에서 실패하므로 renderToStaticMarkup 동기 구현으로 모킹.
 * (__tests__/emails/broadcast.test.tsx와 동일 패턴)
 */
import * as ReactDOMServer from 'react-dom/server';
import * as React from 'react';

import { render } from '@react-email/render';
import NewsletterEmail from '@/emails/newsletter';
import type { NewsletterBlock } from '@/lib/newsletter/blocks';

jest.mock('@react-email/render', () => ({
  render: (element: React.ReactElement) =>
    Promise.resolve(ReactDOMServer.renderToStaticMarkup(element)),
}));

const blocks: NewsletterBlock[] = [
  { id: 'b1', type: 'cover', title: '7월의 씨앗페', subtitle: '이달의 작품', imageUrl: '' },
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
  { id: 'b4', type: 'button', label: '전시 보러가기', url: 'https://www.saf2026.com/artworks' },
];

const base = {
  issueNo: 7,
  title: '7월의 씨앗페',
  preheader: '이달의 작품과 소식을 전합니다',
  blocks,
  unsubscribeUrl: 'https://www.saf2026.com/api/email/unsubscribe?t=x',
  webUrl: 'https://www.saf2026.com/newsletter/2026-07',
};

describe('NewsletterEmail', () => {
  it('블록 콘텐츠(작품 카드·텍스트·버튼)를 렌더한다', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, { ...base, isAdvertisement: true })
    );
    expect(html).toContain('가족');
    expect(html).toContain('오윤');
    expect(html).toContain('₩5,000,000');
    expect(html).toContain('안녕하세요, 씨앗페입니다.');
    expect(html).toContain('전시 보러가기');
    expect(html).toContain('https://www.saf2026.com/artworks/aw-1');
  });

  it('제N호·웹에서 보기·수신거부 링크를 포함한다', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, { ...base, isAdvertisement: true })
    );
    expect(html).toContain('제7호');
    expect(html).toContain('https://www.saf2026.com/newsletter/2026-07');
    expect(html).toContain('https://www.saf2026.com/api/email/unsubscribe?t=x');
  });

  it('isAdvertisement=true면 발송사 정보를 포함한다', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, { ...base, isAdvertisement: true })
    );
    expect(html).toContain('발송사 정보');
  });

  it('isAdvertisement=false면 발송사 정보가 없다', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, { ...base, isAdvertisement: false })
    );
    expect(html).not.toContain('발송사 정보');
  });

  it('showPrice=false면 가격을 렌더하지 않는다', async () => {
    const noPriceBlocks = blocks.map((b) =>
      b.type === 'artworkCard' ? { ...b, showPrice: false } : b
    );
    const html = await render(
      React.createElement(NewsletterEmail, {
        ...base,
        blocks: noPriceBlocks,
        isAdvertisement: false,
      })
    );
    expect(html).not.toContain('₩5,000,000');
  });
});
