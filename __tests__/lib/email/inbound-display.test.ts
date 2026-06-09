import { parseInboundReplyBody } from '@/lib/email/inbound-display';

describe('parseInboundReplyBody', () => {
  it('separates a Korean Gmail quote header from an empty reply', () => {
    const body = [
      '2026년 6월 9일 (화) 오후 1:59, 씨앗페 <hello@saf2026.com>님이 작성:',
      '',
      '> 테스트 해봅니다',
      '>',
      '> 황경하님,',
      '>',
      '> ### 테스트 해봅시다 ## 테스트 - 테스트',
      '> 클릭 <https://www.saf2026.com/>',
    ].join('\n');

    expect(parseInboundReplyBody(body)).toEqual({
      replyText: '',
      quotedText: body,
      hasQuotedText: true,
    });
  });

  it('keeps the new reply and folds the quoted previous message', () => {
    const body = [
      '네 확인했습니다.',
      '추가 자료도 보내드릴게요.',
      '',
      '2026년 6월 9일 (화) 오후 1:59, 씨앗페 <hello@saf2026.com>님이 작성:',
      '> 기존 안내문입니다.',
    ].join('\n');

    expect(parseInboundReplyBody(body)).toEqual({
      replyText: '네 확인했습니다.\n추가 자료도 보내드릴게요.',
      quotedText:
        '2026년 6월 9일 (화) 오후 1:59, 씨앗페 <hello@saf2026.com>님이 작성:\n> 기존 안내문입니다.',
      hasQuotedText: true,
    });
  });

  it('returns the whole body when no quoted thread is present', () => {
    expect(parseInboundReplyBody('새 문의입니다.\n전화 부탁드립니다.')).toEqual({
      replyText: '새 문의입니다.\n전화 부탁드립니다.',
      quotedText: '',
      hasQuotedText: false,
    });
  });

  it('splits legacy original-message separators', () => {
    const body = ['좋습니다.', '', '-----Original Message-----', 'From: hello@saf2026.com'].join(
      '\n'
    );

    expect(parseInboundReplyBody(body)).toEqual({
      replyText: '좋습니다.',
      quotedText: '-----Original Message-----\nFrom: hello@saf2026.com',
      hasQuotedText: true,
    });
  });
});
