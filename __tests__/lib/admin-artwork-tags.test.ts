import {
  normalizeAdminTagName,
  toAdminTagSlug,
  normalizeAdminTagColor,
  normalizeAdminTagInput,
} from '@/lib/admin-artwork-tags';

describe('admin-artwork-tags', () => {
  describe('normalizeAdminTagName', () => {
    it('trims and collapses whitespace', () => {
      expect(normalizeAdminTagName('  봄   큐레이션\t후보  ')).toBe('봄 큐레이션 후보');
    });
  });

  describe('toAdminTagSlug', () => {
    it('creates a stable lowercase slug for Korean and English tag names', () => {
      expect(toAdminTagSlug('기업 컬렉션 VIP')).toBe('기업-컬렉션-vip');
    });

    it('removes punctuation and collapses separators', () => {
      expect(toAdminTagSlug('  100만원 이하 / 선물용!!  ')).toBe('100만원-이하-선물용');
    });

    it('falls back to internal-tag when no slug characters remain', () => {
      expect(toAdminTagSlug('!!!')).toBe('internal-tag');
    });
  });

  describe('normalizeAdminTagColor', () => {
    it('keeps valid hex colors lowercase', () => {
      expect(normalizeAdminTagColor('#A7C957')).toBe('#a7c957');
    });

    it('falls back when the color is missing or invalid', () => {
      expect(normalizeAdminTagColor(null)).toBe('#6b7280');
      expect(normalizeAdminTagColor('tomato')).toBe('#6b7280');
    });
  });

  describe('normalizeAdminTagInput', () => {
    it('normalizes name, slug, color, and blank descriptions in one place', () => {
      expect(
        normalizeAdminTagInput({
          name: '  기업   컬렉션 VIP  ',
          color: '#A7C957',
          description: '   ',
        })
      ).toEqual({
        name: '기업 컬렉션 VIP',
        slug: '기업-컬렉션-vip',
        color: '#a7c957',
        description: null,
      });
    });

    it('rejects blank tag names', () => {
      expect(() => normalizeAdminTagInput({ name: '   ' })).toThrow('태그 이름을 입력해주세요.');
    });
  });
});
