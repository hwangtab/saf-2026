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

interface FullscreenMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

jest.mock('../../components/common/Header/FullscreenMenu', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: FullscreenMenuProps) => (
    <div data-testid="fullscreen-menu" data-open={isOpen}>
      FullscreenMenu
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

  it('opens fullscreen menu when button is clicked and closes via close button', () => {
    render(<Header />);
    const openButton = screen.getByLabelText('메뉴 토글');
    const fullscreenMenu = screen.getByTestId('fullscreen-menu');

    expect(fullscreenMenu).toHaveAttribute('data-open', 'false');

    fireEvent.click(openButton);
    expect(fullscreenMenu).toHaveAttribute('data-open', 'true');

    const closeButton = screen.getByTestId('close-menu-btn');
    fireEvent.click(closeButton);
    expect(fullscreenMenu).toHaveAttribute('data-open', 'false');
  });
});
