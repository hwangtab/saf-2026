/** @jest-environment node */
import {
  MAX_DIRECT_RECIPIENTS,
  deriveIsAdvertisement,
  segmentBlockReason,
  isDirectSegment,
  buildGroupInput,
  defaultSegment,
  type SmsRecipientSegment,
} from '@/lib/sms/broadcast-segment';

const content = { bodyText: '안녕하세요' };

describe('SMS broadcast-segment', () => {
  it('MAX_DIRECT_RECIPIENTS === 500', () => {
    expect(MAX_DIRECT_RECIPIENTS).toBe(500);
  });

  it('deriveIsAdvertisement: customer=true, member=false, direct=토글', () => {
    expect(deriveIsAdvertisement({ kind: 'customer' })).toBe(true);
    expect(deriveIsAdvertisement({ kind: 'member', subset: 'all' })).toBe(false);
    expect(deriveIsAdvertisement({ kind: 'direct', contacts: [], advertising: true })).toBe(true);
    expect(deriveIsAdvertisement({ kind: 'direct', contacts: [], advertising: false })).toBe(false);
  });

  it('buildGroupInput: customer는 광고 강제 + 채널 매핑', () => {
    const out = buildGroupInput({ kind: 'customer' }, content);
    expect(out).toMatchObject({
      channel: 'customer',
      isAdvertisement: true,
      bodyText: '안녕하세요',
    });
  });

  it('buildGroupInput: member subset 전달', () => {
    const out = buildGroupInput({ kind: 'member', subset: 'artist' }, content);
    expect(out).toMatchObject({ channel: 'member', audienceFilter: { subset: 'artist' } });
  });

  it('segmentBlockReason: direct 0명/초과/대기', () => {
    expect(segmentBlockReason({ kind: 'direct', contacts: [], advertising: false }, false)).toMatch(
      /1명 이상/
    );
    expect(
      segmentBlockReason(
        { kind: 'direct', contacts: [{ phone: '01011112222', name: null }], advertising: false },
        true
      )
    ).toMatch(/추가/);
    const over: SmsRecipientSegment = {
      kind: 'direct',
      contacts: Array.from({ length: 501 }, (_, i) => ({
        phone: `0101111${1000 + i}`,
        name: null,
      })),
      advertising: false,
    };
    expect(segmentBlockReason(over, false)).toMatch(/최대 500/);
  });

  it('isDirectSegment 타입 가드', () => {
    expect(isDirectSegment({ kind: 'direct', contacts: [], advertising: false })).toBe(true);
    expect(isDirectSegment({ kind: 'customer' })).toBe(false);
  });

  it('defaultSegment는 깨끗한 기본값', () => {
    expect(defaultSegment('member')).toEqual({ kind: 'member', subset: 'all' });
    expect(defaultSegment('direct')).toEqual({ kind: 'direct', contacts: [], advertising: false });
  });
});
