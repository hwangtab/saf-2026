import { act, renderHook } from '@testing-library/react';
import { useHeaderStyle } from '../../lib/hooks/useHeaderStyle';

let mockPathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

function setWindowScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value,
  });
}

describe('useHeaderStyle', () => {
  beforeEach(() => {
    mockPathname = '/';
    setWindowScrollY(0);

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps header transparent at top on hero route', () => {
    const { result } = renderHook(() => useHeaderStyle());

    expect(result.current.headerStyle).toBe('bg-transparent');
    expect(result.current.isDarkText).toBe(false);
  });

  it('treats /index path as hero route and keeps header transparent at top', () => {
    mockPathname = '/index';
    const { result } = renderHook(() => useHeaderStyle());

    expect(result.current.headerStyle).toBe('bg-transparent');
    expect(result.current.isDarkText).toBe(false);
  });

  it('switches to solid when scrolled down on hero route', () => {
    const { result } = renderHook(() => useHeaderStyle());

    act(() => {
      setWindowScrollY(120);
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.headerStyle).toContain('bg-white/80');
    expect(result.current.isDarkText).toBe(true);
  });

  it('switches back to transparent when returning to top', () => {
    setWindowScrollY(100);
    const { result } = renderHook(() => useHeaderStyle());

    expect(result.current.headerStyle).toContain('bg-white/80');

    act(() => {
      setWindowScrollY(0);
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.headerStyle).toBe('bg-transparent');
    expect(result.current.isDarkText).toBe(false);
  });

  it('uses solid header on non-hero routes', () => {
    mockPathname = '/unknown-route';
    const { result } = renderHook(() => useHeaderStyle());

    expect(result.current.headerStyle).toContain('bg-white/80');
    expect(result.current.isDarkText).toBe(true);
  });

  it('uses overlay mode while mobile menu is open', () => {
    const { result } = renderHook(() => useHeaderStyle());

    act(() => {
      result.current.openMenu();
    });

    expect(result.current.headerStyle).toContain('bg-white/80');
    expect(result.current.isDarkText).toBe(true);
  });
});
