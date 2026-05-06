import { resolveActiveNotice, type ArtistNoticeRecord } from '@/lib/artist-notice';

const baseRecord: ArtistNoticeRecord = {
  notice_enabled: true,
  notice_type: 'info',
  notice_message: '5월 1일부터 가격이 인상될 예정입니다.',
  notice_message_en: 'Prices will increase on May 1.',
  notice_active_until: null,
};

describe('resolveActiveNotice', () => {
  const fixedNow = new Date('2026-04-30T00:00:00Z');

  it('returns the Korean message for ko locale when enabled', () => {
    const result = resolveActiveNotice(baseRecord, 'ko', fixedNow);
    expect(result).toEqual({
      type: 'info',
      message: '5월 1일부터 가격이 인상될 예정입니다.',
    });
  });

  it('returns the English message for en locale when present', () => {
    const result = resolveActiveNotice(baseRecord, 'en', fixedNow);
    expect(result).toEqual({
      type: 'info',
      message: 'Prices will increase on May 1.',
    });
  });

  it('returns null for en locale when English message is empty', () => {
    const result = resolveActiveNotice({ ...baseRecord, notice_message_en: null }, 'en', fixedNow);
    expect(result).toBeNull();
  });

  it('returns null for en locale when English message is blank whitespace', () => {
    const result = resolveActiveNotice({ ...baseRecord, notice_message_en: '   ' }, 'en', fixedNow);
    expect(result).toBeNull();
  });

  it('returns null when notice_enabled is false (preserves message)', () => {
    const result = resolveActiveNotice({ ...baseRecord, notice_enabled: false }, 'ko', fixedNow);
    expect(result).toBeNull();
  });

  it('returns null when notice_message is empty', () => {
    const result = resolveActiveNotice({ ...baseRecord, notice_message: '' }, 'ko', fixedNow);
    expect(result).toBeNull();
  });

  it('returns null when notice_message is only whitespace', () => {
    const result = resolveActiveNotice(
      { ...baseRecord, notice_message: '   \n  ' },
      'ko',
      fixedNow
    );
    expect(result).toBeNull();
  });

  it('returns null when active_until is in the past', () => {
    const result = resolveActiveNotice(
      { ...baseRecord, notice_active_until: '2026-04-01T00:00:00Z' },
      'ko',
      fixedNow
    );
    expect(result).toBeNull();
  });

  it('returns the notice when active_until is in the future', () => {
    const result = resolveActiveNotice(
      { ...baseRecord, notice_active_until: '2026-05-30T00:00:00Z' },
      'ko',
      fixedNow
    );
    expect(result?.message).toBe('5월 1일부터 가격이 인상될 예정입니다.');
  });

  it('returns null when active_until equals now (boundary)', () => {
    const result = resolveActiveNotice(
      { ...baseRecord, notice_active_until: fixedNow.toISOString() },
      'ko',
      fixedNow
    );
    expect(result).toBeNull();
  });

  it('preserves the notice when active_until is unparseable (defensive)', () => {
    const result = resolveActiveNotice(
      { ...baseRecord, notice_active_until: 'not-a-date' },
      'ko',
      fixedNow
    );
    expect(result?.message).toBe('5월 1일부터 가격이 인상될 예정입니다.');
  });

  it('falls back to info when notice_type is unrecognized', () => {
    const result = resolveActiveNotice({ ...baseRecord, notice_type: 'panic' }, 'ko', fixedNow);
    expect(result?.type).toBe('info');
  });

  it('falls back to info when notice_type is null', () => {
    const result = resolveActiveNotice({ ...baseRecord, notice_type: null }, 'ko', fixedNow);
    expect(result?.type).toBe('info');
  });

  it('returns "warning" and "urgent" types verbatim', () => {
    expect(
      resolveActiveNotice({ ...baseRecord, notice_type: 'warning' }, 'ko', fixedNow)?.type
    ).toBe('warning');
    expect(
      resolveActiveNotice({ ...baseRecord, notice_type: 'urgent' }, 'ko', fixedNow)?.type
    ).toBe('urgent');
  });

  it('returns null for null/undefined record', () => {
    expect(resolveActiveNotice(null, 'ko', fixedNow)).toBeNull();
    expect(resolveActiveNotice(undefined, 'ko', fixedNow)).toBeNull();
  });
});
