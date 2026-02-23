import { renderHook, act } from '@testing-library/react';
import { useArtworkFilter } from '../../lib/hooks/useArtworkFilter';
import { Artwork } from '../../types';

const mockPush = jest.fn();
const mockReplace = jest.fn();

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
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/artworks',
}));

const mockArtworks: Artwork[] = [
  {
    id: '1',
    artist: '작가A',
    title: '작품1',
    price: '₩100,000',
    sold: false,
    description: '',
    size: '',
    material: '',
    year: '',
    edition: '',
    image: '',
  },
  {
    id: '2',
    artist: '작가B',
    title: '작품2',
    price: '₩50,000',
    sold: true,
    description: '',
    size: '',
    material: '',
    year: '',
    edition: '',
    image: '',
  },
  {
    id: '3',
    artist: '작가A',
    title: '작품3',
    price: '문의',
    sold: false,
    description: '',
    size: '',
    material: '',
    year: '',
    edition: '',
    image: '',
  },
];

describe('useArtworkFilter', () => {
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

  it('should return all artworks initially', () => {
    const { result } = renderHook(() => useArtworkFilter(mockArtworks));
    expect(result.current.filteredArtworks).toHaveLength(3);
    expect(result.current.sortedArtworks).toHaveLength(3);
  });

  it('should filter by search query', () => {
    const { result } = renderHook(() => useArtworkFilter(mockArtworks));

    act(() => {
      result.current.setSearchQuery('작가B');
    });

    // Advance timers to account for debounce delay (300ms)
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.filteredArtworks).toHaveLength(1);
    expect(result.current.filteredArtworks[0].title).toBe('작품2');
  });

  it('should support choseong search query', () => {
    const artworksWithChoseong: Artwork[] = [
      ...mockArtworks,
      {
        id: '4',
        artist: '오윤',
        title: '오월 판화',
        price: '₩70,000',
        sold: false,
        description: '목판화',
        size: '',
        material: '',
        year: '',
        edition: '',
        image: '',
      },
    ];
    const { result } = renderHook(() => useArtworkFilter(artworksWithChoseong));

    act(() => {
      result.current.setSearchQuery('오ㅇ');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.filteredArtworks).toHaveLength(1);
    expect(result.current.filteredArtworks[0].artist).toBe('오윤');
  });

  it('should sync search query with history API without router navigation', () => {
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
    const { result } = renderHook(() => useArtworkFilter(mockArtworks));

    act(() => {
      result.current.setSearchQuery('오ㅇ');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(replaceStateSpy).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    replaceStateSpy.mockRestore();
  });

  it('should keep using router navigation for non-search filters', () => {
    const { result } = renderHook(() => useArtworkFilter(mockArtworks));

    act(() => {
      result.current.setStatusFilter('sold');
    });

    expect(mockReplace).toHaveBeenCalled();
  });

  it('should filter by status (selling)', () => {
    const { result } = renderHook(() => useArtworkFilter(mockArtworks));

    act(() => {
      result.current.setStatusFilter('selling');
    });

    expect(result.current.filteredArtworks).toHaveLength(2);
    expect(result.current.filteredArtworks.every((a) => !a.sold)).toBe(true);
  });

  it('should filter by status (sold)', () => {
    const { result } = renderHook(() => useArtworkFilter(mockArtworks));

    act(() => {
      result.current.setStatusFilter('sold');
    });

    expect(result.current.filteredArtworks).toHaveLength(1);
    expect(result.current.filteredArtworks[0].sold).toBe(true);
  });

  it('should sort by price descending', () => {
    const { result } = renderHook(() => useArtworkFilter(mockArtworks));

    act(() => {
      result.current.setSortOption('price-desc');
    });

    const sorted = result.current.sortedArtworks;
    expect(sorted[0].id).toBe('1');
    expect(sorted[1].id).toBe('2');
    expect(sorted[2].id).toBe('3');
  });

  it('should sort by price ascending', () => {
    const { result } = renderHook(() => useArtworkFilter(mockArtworks));

    act(() => {
      result.current.setSortOption('price-asc');
    });

    const sorted = result.current.sortedArtworks;
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('1');
    expect(sorted[2].id).toBe('3');
  });

  it('should filter by selected artist', () => {
    const { result } = renderHook(() => useArtworkFilter(mockArtworks));

    act(() => {
      result.current.setSelectedArtist('작가A');
    });

    expect(result.current.filteredArtworks).toHaveLength(2);
    expect(result.current.filteredArtworks.every((a) => a.artist === '작가A')).toBe(true);
  });
});
