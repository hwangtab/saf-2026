import { render, screen, fireEvent } from '@testing-library/react';
import Header from '@/components/common/Header';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

jest.mock('next-image-export-optimizer', () => ({
  __esModule: true,
  default: ({ fill, priority, ...props }: any) => <img {...props} alt={props.alt} />,
}));

// Mock DesktopNav and MobileMenu to simplify testing
jest.mock('@/components/common/Header/DesktopNav', () => ({
  __esModule: true,
  default: () => <div data-testid="desktop-nav">DesktopNav</div>,
}));

jest.mock('@/components/common/Header/MobileMenu', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: any) => (
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

    // Initially closed
    expect(mobileMenu).toHaveAttribute('data-open', 'false');

    // Open
    fireEvent.click(toggleButton);
    expect(mobileMenu).toHaveAttribute('data-open', 'true');

    // Close
    fireEvent.click(toggleButton);
    // Note: Header state machine goes open -> closing -> closed.
    // My mock passes `isOpen` which is `menuState === 'open'`.
    // Clicking toggle while open triggers startCloseMenu -> closing.
    // So isOpen becomes false immediately.
    expect(mobileMenu).toHaveAttribute('data-open', 'false');
  });
});
