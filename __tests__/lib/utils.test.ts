import { cn, formatArtistName } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3');
    });

    it('should merge tailwind classes properly', () => {
      expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
    });
  });

  describe('formatArtistName', () => {
    it('should add 작가 suffix for regular artist names', () => {
      expect(formatArtistName('김철수')).toBe('김철수 작가');
      expect(formatArtistName('박영희')).toBe('박영희 작가');
    });

    it('should NOT add suffix for 작가미상', () => {
      expect(formatArtistName('작가미상')).toBe('작가미상');
    });

    it('should handle addSuffix parameter', () => {
      expect(formatArtistName('김철수', false)).toBe('김철수');
      expect(formatArtistName('작가미상', false)).toBe('작가미상');
    });

    it('should handle empty strings gracefully', () => {
      expect(formatArtistName('')).toBe('');
      expect(formatArtistName('', false)).toBe('');
    });

    it('should handle edge cases', () => {
      expect(formatArtistName('작가들')).toBe('작가들 작가');
      expect(formatArtistName('미상')).toBe('미상 작가');
    });
  });
});
