import { dedupeAcrossChannels } from '@/lib/newsletter/enqueue';
import type { Recipient } from '@/lib/email/audiences/types';

const r = (email: string, hash: string): Recipient => ({
  email,
  name: null,
  locale: 'ko',
  emailHash: hash,
});

describe('dedupeAcrossChannels', () => {
  it('뒤 채널에서 앞 채널과 중복된 수신자를 제거한다', () => {
    const result = dedupeAcrossChannels([
      { channel: 'customer', recipients: [r('a@x.com', 'h-a'), r('b@x.com', 'h-b')] },
      { channel: 'member', recipients: [r('b@x.com', 'h-b'), r('c@x.com', 'h-c')] },
    ]);
    expect(result[0].recipients.map((x) => x.email)).toEqual(['a@x.com', 'b@x.com']);
    expect(result[1].recipients.map((x) => x.email)).toEqual(['c@x.com']);
  });

  it('같은 채널 내 중복도 제거한다', () => {
    const result = dedupeAcrossChannels([
      { channel: 'customer', recipients: [r('a@x.com', 'h-a'), r('a@x.com', 'h-a')] },
    ]);
    expect(result[0].recipients).toHaveLength(1);
  });
});
