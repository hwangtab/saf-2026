import { render, screen } from '@testing-library/react';
import * as Icons from '@/components/ui/Icons';

describe('Icons', () => {
  const iconNames = Object.keys(Icons) as Array<keyof typeof Icons>;

  iconNames.forEach((iconName) => {
    it(`renders ${iconName} correctly`, () => {
      const IconComponent = Icons[iconName];
      render(<IconComponent data-testid={iconName} />);
      const icon = screen.getByTestId(iconName);
      expect(icon).toBeInTheDocument();
      // SVG tag verification
      expect(icon.tagName.toLowerCase()).toBe('svg');
    });
  });

  it('applies custom className', () => {
    const { SearchIcon } = Icons;
    render(<SearchIcon data-testid="custom-icon" className="w-10 h-10" />);
    const icon = screen.getByTestId('custom-icon');
    expect(icon).toHaveClass('w-10 h-10');
  });
});
