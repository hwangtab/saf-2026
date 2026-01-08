import { cn, getNavLinkClasses } from '@/lib/utils';

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

  describe('getNavLinkClasses', () => {
    it('should return correct classes for desktop inactive link', () => {
      const classes = getNavLinkClasses(false, 'desktop');
      expect(classes).toContain('text-charcoal');
      expect(classes).toContain('hover:text-primary');
    });

    it('should return correct classes for desktop active link', () => {
      const classes = getNavLinkClasses(true, 'desktop');
      expect(classes).toContain('text-primary');
      expect(classes).not.toContain('text-charcoal');
    });

    it('should allow custom text color for desktop links', () => {
      const classes = getNavLinkClasses(false, 'desktop', 'text-white');
      expect(classes).toContain('text-white');
      expect(classes).not.toContain('text-charcoal');
    });

    it('should return correct classes for mobile inactive link', () => {
      const classes = getNavLinkClasses(false, 'mobile');
      expect(classes).toContain('border-transparent');
      expect(classes).toContain('text-charcoal');
    });

    it('should return correct classes for mobile active link', () => {
      const classes = getNavLinkClasses(true, 'mobile');
      expect(classes).toContain('text-primary');
      expect(classes).toContain('font-semibold');
      expect(classes).toContain('bg-primary/10');
    });
  });
});
