import { getNavLinkClasses } from '@/lib/navigation';

describe('getNavLinkClasses', () => {
  describe('desktop', () => {
    it('should return correct classes for inactive link', () => {
      const classes = getNavLinkClasses(false, 'desktop');
      expect(classes).toContain('text-charcoal');
      expect(classes).toContain('hover:text-primary');
    });

    it('should return correct classes for active link', () => {
      const classes = getNavLinkClasses(true, 'desktop');
      expect(classes).toContain('text-primary');
      expect(classes).not.toContain('text-charcoal');
    });

    it('should allow custom text color', () => {
      const classes = getNavLinkClasses(false, 'desktop', 'text-white');
      expect(classes).toContain('text-white');
      expect(classes).not.toContain('text-charcoal');
    });
  });

  describe('mobile', () => {
    it('should return correct classes for inactive link', () => {
      const classes = getNavLinkClasses(false, 'mobile');
      expect(classes).toContain('border-transparent');
      expect(classes).toContain('text-charcoal');
    });

    it('should return correct classes for active link', () => {
      const classes = getNavLinkClasses(true, 'mobile');
      expect(classes).toContain('text-primary');
      expect(classes).toContain('font-semibold');
      expect(classes).toContain('bg-primary/10');
    });
  });
});
