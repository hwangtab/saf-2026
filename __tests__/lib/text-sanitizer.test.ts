import {
  sanitizeNullableTextForRscPayload,
  sanitizeSingleLineTextForRscPayload,
  sanitizeTextForRscPayload,
} from '@/lib/utils/text-sanitizer';

describe('sanitizeTextForRscPayload', () => {
  it('replaces line and paragraph separators with newline', () => {
    expect(sanitizeTextForRscPayload('a\u2028b\u2029c')).toBe('a\nb\nc');
  });

  it('removes invalid control characters', () => {
    expect(sanitizeTextForRscPayload('A\u0000B\u0007C')).toBe('ABC');
  });

  it('keeps normal text unchanged', () => {
    expect(sanitizeTextForRscPayload('정상 텍스트 123')).toBe('정상 텍스트 123');
  });

  it('preserves tab/newline/carriage return characters', () => {
    expect(sanitizeTextForRscPayload('a\tb\nc\rd')).toBe('a\tb\nc\rd');
  });
});

describe('sanitizeNullableTextForRscPayload', () => {
  it('returns null for null/undefined', () => {
    expect(sanitizeNullableTextForRscPayload(null)).toBeNull();
    expect(sanitizeNullableTextForRscPayload(undefined)).toBeNull();
  });

  it('sanitizes non-null values', () => {
    expect(sanitizeNullableTextForRscPayload('x\u2028y')).toBe('x\ny');
  });
});

describe('sanitizeSingleLineTextForRscPayload', () => {
  it('normalizes to single-line values', () => {
    expect(sanitizeSingleLineTextForRscPayload('  a\u2028b\n\tc  ')).toBe('abc');
  });
});
