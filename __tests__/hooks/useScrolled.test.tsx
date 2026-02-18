import { renderHook, act, fireEvent } from '@testing-library/react';
import { useScrolled } from '../../lib/hooks/useScrolled';

let mockPathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

describe('useScrolled', () => {
  beforeEach(() => {
    mockPathname = '/';
    jest.useFakeTimers();

    // Mock requestAnimationFrame to run immediately
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const fireScroll = (y: number) => {
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: y, writable: true });
      fireEvent.scroll(window);
    });
  };

  it('should return false initially when not scrolled', () => {
    const { result } = renderHook(() => useScrolled());
    expect(result.current).toBe(false);
  });

  it('should return true when scrolled fast threshold', () => {
    const { result } = renderHook(() => useScrolled(10));

    fireScroll(20);

    expect(result.current).toBe(true);
  });

  it('should revert to false when scrolled back up', () => {
    const { result } = renderHook(() => useScrolled(10));

    fireScroll(20);
    expect(result.current).toBe(true);

    fireScroll(0);
    expect(result.current).toBe(false);
  });

  it('should freeze state when disabled is true', () => {
    const { result, rerender } = renderHook(({ disabled }) => useScrolled(10, disabled), {
      initialProps: { disabled: false },
    });

    // Scroll down -> true
    fireScroll(20);
    expect(result.current).toBe(true);

    // Disable
    rerender({ disabled: true });

    // Scroll up -> should stay true because frozen
    fireScroll(0);
    expect(result.current).toBe(true);
  });

  it('should optimistically reset to top on hero route changes', () => {
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 30, writable: true });
    });

    const { result, rerender } = renderHook(
      ({ optimisticTopOnPathChange }) =>
        useScrolled(10, false, { optimisticTopOnPathChange, settleDelayMs: 120 }),
      {
        initialProps: { optimisticTopOnPathChange: false },
      }
    );

    expect(result.current).toBe(true);

    act(() => {
      mockPathname = '/special/oh-yoon';
      rerender({ optimisticTopOnPathChange: true });
    });

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(120);
    });

    expect(result.current).toBe(true);
  });
});
