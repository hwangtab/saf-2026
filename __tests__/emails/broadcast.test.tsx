/**
 * @jest-environment node
 *
 * @react-email/render 의 내부 dynamic import("react-dom/server")가
 * Jest 기본 변환 환경에서 --experimental-vm-modules 없이 실패하므로,
 * renderToStaticMarkup 기반의 동기 구현으로 모킹.
 */
import * as ReactDOMServer from 'react-dom/server';
import * as React from 'react';

import { render } from '@react-email/render';
import BroadcastEmail from '@/emails/broadcast';

jest.mock('@react-email/render', () => ({
  render: (element: React.ReactElement) =>
    Promise.resolve(ReactDOMServer.renderToStaticMarkup(element)),
}));

const base = {
  recipientName: '홍길동',
  subject: '신작 안내',
  bodyParagraphs: ['본문'],
  unsubscribeUrl: 'https://www.saf2026.com/api/email/unsubscribe?t=x',
  locale: 'ko' as const,
};

describe('BroadcastEmail isAdvertisement', () => {
  it('isAdvertisement=true면 헤더에 (광고) 접두어와 발송사 정보를 넣는다', async () => {
    const html = await render(
      React.createElement(BroadcastEmail, { ...base, channel: 'individual', isAdvertisement: true })
    );
    expect(html).toContain('(광고) 신작 안내');
    expect(html).toContain('발송사 정보');
  });

  it('isAdvertisement=false면 (광고) 접두어와 발송사 정보가 없다', async () => {
    const html = await render(
      React.createElement(BroadcastEmail, {
        ...base,
        channel: 'individual',
        isAdvertisement: false,
      })
    );
    expect(html).not.toContain('(광고)');
    expect(html).not.toContain('발송사 정보');
  });
});
