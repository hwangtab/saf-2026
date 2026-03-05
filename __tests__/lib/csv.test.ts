import { csvSafeCell } from '@/lib/utils/csv';

describe('csvSafeCell', () => {
  describe('null/undefined handling', () => {
    it('returns empty string for null', () => {
      expect(csvSafeCell(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(csvSafeCell(undefined)).toBe('');
    });
  });

  describe('formula injection prevention', () => {
    it.each([['=SUM(A1)'], ['+1+1'], ['-1'], ['@A1']])(
      'prefixes formula-starting string "%s" with a single quote',
      (input) => {
        const result = csvSafeCell(input);
        expect(result.startsWith("'")).toBe(true);
      }
    );

    it('sanitizes tab-starting string (wrapped in quotes with prefix)', () => {
      // \t triggers prefix; result may be wrapped due to RFC 4180 whitespace handling
      const result = csvSafeCell('\tcommand');
      expect(result).toContain("'");
    });

    it('sanitizes CR-starting string (wrapped in quotes with prefix)', () => {
      // \r triggers prefix AND RFC 4180 quoting
      const result = csvSafeCell('\rcommand');
      expect(result).toContain("'");
    });

    it('does not prefix a regular string', () => {
      expect(csvSafeCell('hello')).toBe('hello');
    });

    it('does not prefix a string starting with a normal character', () => {
      expect(csvSafeCell('안녕하세요')).toBe('안녕하세요');
    });
  });

  describe('number type — no formula prefix', () => {
    it('returns negative number as-is without prefix', () => {
      expect(csvSafeCell(-5)).toBe('-5');
    });

    it('returns positive number as-is', () => {
      expect(csvSafeCell(42)).toBe('42');
    });

    it('returns zero as-is', () => {
      expect(csvSafeCell(0)).toBe('0');
    });
  });

  describe('RFC 4180 quoting', () => {
    it('wraps value containing comma in double quotes', () => {
      expect(csvSafeCell('a,b')).toBe('"a,b"');
    });

    it('wraps value containing newline in double quotes', () => {
      expect(csvSafeCell('a\nb')).toBe('"a\nb"');
    });

    it('doubles internal double-quotes and wraps', () => {
      expect(csvSafeCell('say "hi"')).toBe('"say ""hi"""');
    });

    it('applies RFC quoting after formula prefix', () => {
      // value starts with = and also contains a comma
      const result = csvSafeCell('=A1,B1');
      expect(result).toBe('"\'=A1,B1"');
    });
  });
});
