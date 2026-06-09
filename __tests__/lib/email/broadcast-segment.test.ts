import {
  buildGroupInput,
  defaultSegment,
  deriveIsAdvertisement,
  isDirectSegment,
  MAX_DIRECT_RECIPIENTS,
  segmentBlockReason,
  segmentToPreviewArgs,
  type RecipientSegment,
} from '@/lib/email/broadcast-segment';

describe('deriveIsAdvertisement — 광고 여부 단일 출처', () => {
  it('고객 마케팅은 항상 광고(서버 강제와 일치)', () => {
    expect(deriveIsAdvertisement({ kind: 'customer' })).toBe(true);
  });

  it('작가·출품자와 청원은 항상 정보성', () => {
    expect(deriveIsAdvertisement({ kind: 'member', subset: 'all' })).toBe(false);
    expect(deriveIsAdvertisement({ kind: 'petition', petitionSlug: 'x' })).toBe(false);
  });

  it('작품 구매자/직접 지정은 토글을 따른다', () => {
    expect(
      deriveIsAdvertisement({ kind: 'artwork-buyer', artworkId: 'a', advertising: true })
    ).toBe(true);
    expect(
      deriveIsAdvertisement({ kind: 'artwork-buyer', artworkId: 'a', advertising: false })
    ).toBe(false);
    expect(deriveIsAdvertisement({ kind: 'direct', contacts: [], advertising: true })).toBe(true);
  });
});

describe('segmentToPreviewArgs', () => {
  it('member는 subset 필터를 전달', () => {
    expect(segmentToPreviewArgs({ kind: 'member', subset: 'artist' })).toEqual({
      channel: 'member',
      filter: { subset: 'artist' },
    });
  });

  it('customer는 빈 필터', () => {
    expect(segmentToPreviewArgs({ kind: 'customer' })).toEqual({ channel: 'customer', filter: {} });
  });

  it('청원/작품 미선택은 null(미리보기 불가)', () => {
    expect(segmentToPreviewArgs({ kind: 'petition', petitionSlug: '' })).toBeNull();
    expect(
      segmentToPreviewArgs({ kind: 'artwork-buyer', artworkId: '', advertising: true })
    ).toBeNull();
  });

  it('작품 구매자는 customer 채널 + artworkId/advertising 필터', () => {
    expect(
      segmentToPreviewArgs({ kind: 'artwork-buyer', artworkId: 'art-1', advertising: true })
    ).toEqual({ channel: 'customer', filter: { artworkId: 'art-1', advertising: true } });
  });

  it('직접 지정은 서버 미리보기 없음(null)', () => {
    expect(segmentToPreviewArgs({ kind: 'direct', contacts: [], advertising: false })).toBeNull();
  });
});

describe('buildGroupInput — 기존 server action 계약 보존', () => {
  const content = {
    subject: '제목',
    bodyHtml: '<p>본문</p>',
    bodyText: '본문',
    ctaLabel: '',
    ctaUrl: '',
  };

  it('member는 channel member + subset 필터', () => {
    const input = buildGroupInput({ kind: 'member', subset: 'exhibitor' }, content);
    expect(input.channel).toBe('member');
    expect(input.audienceFilter).toEqual({ subset: 'exhibitor' });
    expect(input.isAdvertisement).toBe(false);
  });

  it('customer는 isAdvertisement가 강제로 true', () => {
    const input = buildGroupInput({ kind: 'customer' }, content);
    expect(input.channel).toBe('customer');
    expect(input.isAdvertisement).toBe(true);
  });

  it('petition은 petitionSlug를 분리 전달', () => {
    const input = buildGroupInput({ kind: 'petition', petitionSlug: 'oh-yoon' }, content);
    expect(input.channel).toBe('petition');
    expect(input.petitionSlug).toBe('oh-yoon');
  });

  it('작품 구매자는 customer 채널 + artwork-buyer 필터 + 토글 광고 플래그', () => {
    const input = buildGroupInput(
      { kind: 'artwork-buyer', artworkId: 'art-9', advertising: true },
      content
    );
    expect(input.channel).toBe('customer');
    expect(input.audienceFilter).toEqual({
      subset: 'all',
      artworkId: 'art-9',
      mode: 'artwork-buyer',
    });
    expect(input.isAdvertisement).toBe(true);
  });

  it('CTA 빈 문자열은 undefined로 정규화', () => {
    const input = buildGroupInput({ kind: 'customer' }, { ...content, ctaLabel: '', ctaUrl: '' });
    expect(input.ctaLabel).toBeUndefined();
    expect(input.ctaUrl).toBeUndefined();
  });
});

describe('segmentBlockReason', () => {
  it('청원 미선택을 차단', () => {
    expect(segmentBlockReason({ kind: 'petition', petitionSlug: '' }, false)).toMatch(/청원/);
  });

  it('작품 미선택을 차단', () => {
    expect(
      segmentBlockReason({ kind: 'artwork-buyer', artworkId: '', advertising: true }, false)
    ).toMatch(/작품/);
  });

  it('직접 지정: 수신자 0명 차단, 입력 중 미추가 차단, 정상 통과', () => {
    expect(segmentBlockReason({ kind: 'direct', contacts: [], advertising: false }, false)).toMatch(
      /1명 이상/
    );
    expect(
      segmentBlockReason(
        { kind: 'direct', contacts: [{ email: 'a@x.com', name: null }], advertising: false },
        true
      )
    ).toMatch(/입력한 이메일 추가/);
    expect(
      segmentBlockReason(
        { kind: 'direct', contacts: [{ email: 'a@x.com', name: null }], advertising: false },
        false
      )
    ).toBeNull();
  });

  it('member/customer는 차단 없음', () => {
    expect(segmentBlockReason({ kind: 'member', subset: 'all' }, false)).toBeNull();
    expect(segmentBlockReason({ kind: 'customer' }, false)).toBeNull();
  });

  it('직접 지정 수신자가 상한을 넘으면 차단', () => {
    const contacts = Array.from({ length: MAX_DIRECT_RECIPIENTS + 1 }, (_, i) => ({
      email: `u${i}@x.com`,
      name: null,
    }));
    expect(segmentBlockReason({ kind: 'direct', contacts, advertising: false }, false)).toMatch(
      /최대/
    );
  });
});

describe('defaultSegment / isDirectSegment', () => {
  it('종류 전환 시 깨끗한 기본값(잔류 상태 부활 방지)', () => {
    const seg = defaultSegment('artwork-buyer') as Extract<
      RecipientSegment,
      { kind: 'artwork-buyer' }
    >;
    expect(seg.artworkId).toBe('');
    expect(seg.advertising).toBe(false);
    expect(defaultSegment('member')).toEqual({ kind: 'member', subset: 'all' });
  });

  it('isDirectSegment 타입 가드', () => {
    expect(isDirectSegment({ kind: 'direct', contacts: [], advertising: false })).toBe(true);
    expect(isDirectSegment({ kind: 'customer' })).toBe(false);
  });
});
