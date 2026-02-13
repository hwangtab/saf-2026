import { render, screen, fireEvent, act } from '@testing-library/react';
import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import { Artwork } from '@/types';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSearchParams = new URLSearchParams();

// Mock useTransition to immediately execute transitions
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useTransition: () => [false, (fn: () => void) => fn()],
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/artworks',
}));

jest.mock('@/components/features/MasonryGallery', () => {
  return function DummyMasonryGallery({ artworks }: { artworks: Artwork[] }) {
    return (
      <div data-testid="masonry-gallery">
        {artworks.map((a) => (
          <div key={a.id}>{a.title}</div>
        ))}
      </div>
    );
  };
});

const mockArtworks: Artwork[] = [
  {
    id: '1',
    title: 'Artwork 1',
    artist: 'Artist A',
    image: '1.jpg',
    price: '10000',
    sold: false,
    material: '',
    size: '',
  },
  {
    id: '2',
    title: 'Artwork 2',
    artist: 'Artist B',
    image: '2.jpg',
    price: '20000',
    sold: true,
    material: '',
    size: '',
  },
  {
    id: '3',
    title: 'Unique Piece',
    artist: 'Artist A',
    image: '3.jpg',
    price: '30000',
    sold: false,
    material: '',
    size: '',
  },
];

describe('ArtworkGalleryWithSort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders correctly with default state', () => {
    render(<ArtworkGalleryWithSort artworks={mockArtworks} />);

    expect(screen.getByRole('textbox', { name: /작품 검색/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /판매 상태 필터/i })).toBeInTheDocument();
    expect(screen.getByText('Artwork 1')).toBeInTheDocument();
    expect(screen.getByText('Artwork 2')).toBeInTheDocument();
  });

  it('filters by status correctly', () => {
    render(<ArtworkGalleryWithSort artworks={mockArtworks} />);

    const sellingButton = screen.getByRole('radio', { name: /판매중/i });
    fireEvent.click(sellingButton);

    expect(screen.getByText('Artwork 1')).toBeInTheDocument();
    expect(screen.queryByText('Artwork 2')).not.toBeInTheDocument();
  });

  it('filters by search query', async () => {
    render(<ArtworkGalleryWithSort artworks={mockArtworks} />);

    const searchInput = screen.getByRole('textbox', { name: /작품 검색/i });
    fireEvent.change(searchInput, { target: { value: 'Unique' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText('Unique Piece')).toBeInTheDocument();
    expect(screen.queryByText('Artwork 1')).not.toBeInTheDocument();
  });

  it('shows empty state when no results', async () => {
    render(<ArtworkGalleryWithSort artworks={mockArtworks} />);

    const searchInput = screen.getByRole('textbox', { name: /작품 검색/i });
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText(/검색 결과가 없습니다/i)).toBeInTheDocument();
    expect(screen.queryByTestId('masonry-gallery')).not.toBeInTheDocument();
  });
});
