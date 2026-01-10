import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../../components/common/Header';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

interface ImageProps {
  fill?: boolean;
  priority?: boolean;
  alt?: string;
  [key: string]: any;
}

jest.mock('next-image-export-optimizer', () => ({
  __esModule: true,
  default: ({ fill, priority, ...props }: ImageProps) => <img {...props} alt={props.alt || ''} />,
}));

jest.mock('../../components/common/Header/DesktopNav', () => ({
  __esModule: true,
  default: () => <div data-testid="desktop-nav">DesktopNav</div>,
}));

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

jest.mock('../../components/common/Header/MobileMenu', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: MobileMenuProps) => (
    <div data-testid="mobile-menu" data-open={isOpen}>
      MobileMenu
      <button onClick={onClose} data-testid="close-menu-btn">
        Close
      </button>
    </div>
  ),
}));

describe('Header', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'scrollTo', { value: jest.fn(), writable: true });
  });

  it('renders logo and navigation', () => {
    render(<Header />);
    expect(screen.getByAltText('씨앗페 로고')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-nav')).toBeInTheDocument();
  });

  it('toggles mobile menu when button is clicked', () => {
    render(<Header />);
    const toggleButton = screen.getByLabelText('메뉴 토글');
    const mobileMenu = screen.getByTestId('mobile-menu');

    expect(mobileMenu).toHaveAttribute('data-open', 'false');

    fireEvent.click(toggleButton);
    expect(mobileMenu).toHaveAttribute('data-open', 'true');

    fireEvent.click(toggleButton);
    expect(mobileMenu).toHaveAttribute('data-open', 'false');
  });
});
