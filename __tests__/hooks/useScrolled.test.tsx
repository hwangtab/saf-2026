import { renderHook, act, fireEvent } from '@testing-library/react';
import { useScrolled } from '@/lib/hooks/useScrolled';

describe('useScrolled', () => {
  it('should return false initially when not scrolled', () => {
    const { result } = renderHook(() => useScrolled());
    expect(result.current).toBe(false);
  });

  it('should return true when scrolled fast threshold', () => {
    const { result } = renderHook(() => useScrolled(10));

    act(() => {
      window.scrollY = 20;
      fireEvent.scroll(window);
    });

    expect(result.current).toBe(true);
  });

  it('should revert to false when scrolled back up', () => {
    const { result } = renderHook(() => useScrolled(10));

    act(() => {
      window.scrollY = 20;
      fireEvent.scroll(window);
    });
    expect(result.current).toBe(true);

    act(() => {
      window.scrollY = 0;
      fireEvent.scroll(window);
    });
    expect(result.current).toBe(false);
  });

  it('should force return value when force state is provided', () => {
    const { result } = renderHook(() => useScrolled(10, true)); // force true

    expect(result.current).toBe(true);

    // Even if we scroll 0, it should stay true
    act(() => {
      window.scrollY = 0;
      fireEvent.scroll(window);
    });
    expect(result.current).toBe(true);
  });
});
