import { sanitizeIlikeQuery } from '@/lib/utils/query';

describe('sanitizeIlikeQuery', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeIlikeQuery('  hello  ')).toBe('hello');
  });

  it('escapes SQL LIKE wildcard underscore', () => {
    expect(sanitizeIlikeQuery('name_ko')).toBe('name\\_ko');
  });

  it('escapes single quotes to prevent injection', () => {
    expect(sanitizeIlikeQuery("it's")).toBe("it''s");
  });

  it('removes percent sign (LIKE wildcard)', () => {
    expect(sanitizeIlikeQuery('100%')).toBe('100 ');
  });

  it('removes .or() syntax characters: (, ), ,', () => {
    // Each removed char becomes a space; consecutive spaces are collapsed to one
    expect(sanitizeIlikeQuery('a(b),c')).toBe('a b c');
  });

  it('collapses multiple spaces into one', () => {
    expect(sanitizeIlikeQuery('a   b')).toBe('a b');
  });

  it('preserves Korean characters', () => {
    expect(sanitizeIlikeQuery('홍길동')).toBe('홍길동');
  });

  it('handles empty string', () => {
    expect(sanitizeIlikeQuery('')).toBe('');
  });

  it('handles a complex injection attempt', () => {
    const input = "') OR 1=1--";
    const result = sanitizeIlikeQuery(input);
    // should not contain unescaped single quote or .or() chars
    expect(result).not.toContain("')");
    expect(result).not.toContain('(');
  });
});
