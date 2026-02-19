import { act, renderHook } from '@testing-library/react';
import { useHeaderStyle } from '../../lib/hooks/useHeaderStyle';

let mockPathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  observe: jest.Mock;
  disconnect: jest.Mock;
};

const observers: ObserverRecord[] = [];

class MockIntersectionObserver {
  readonly callback: IntersectionObserverCallback;
  readonly observe = jest.fn();
  readonly disconnect = jest.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observers.push({ callback, observe: this.observe, disconnect: this.disconnect });
  }

  unobserve() {}
  takeRecords() {
    return [];
  }
}

function setSentinelRect(top: number) {
  const sentinel = document.querySelector<HTMLElement>('[data-hero-sentinel="true"]');
  if (!sentinel) return;

  sentinel.getBoundingClientRect = jest.fn(
    () =>
      ({
        top,
        bottom: top + 1,
        left: 0,
        right: 1,
        width: 1,
        height: 1,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect
  );
}

describe('useHeaderStyle', () => {
  beforeEach(() => {
    mockPathname = '/';
    observers.length = 0;
    document.body.innerHTML = '';

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: MockIntersectionObserver,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('keeps header transparent when hero sentinel is at top', () => {
    document.body.innerHTML =
      '<div data-route-path="/"><div data-hero-sentinel="true" aria-hidden="true"></div></div>';
    setSentinelRect(0);

    const { result } = renderHook(() => useHeaderStyle());

    expect(result.current.headerStyle).toBe('bg-transparent');
    expect(result.current.isDarkText).toBe(false);
    expect(observers).toHaveLength(1);
  });

  it('switches to solid when sentinel leaves viewport', () => {
    document.body.innerHTML =
      '<div data-route-path="/"><div data-hero-sentinel="true" aria-hidden="true"></div></div>';
    setSentinelRect(0);

    const { result } = renderHook(() => useHeaderStyle());

    act(() => {
      observers[0]?.callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(result.current.headerStyle).toContain('bg-white/80');
    expect(result.current.isDarkText).toBe(true);
  });

  it('uses solid header on non-hero routes without sentinel', () => {
    mockPathname = '/unknown-route';
    document.body.innerHTML = '<div data-route-path="/unknown-route"><main>content</main></div>';

    const { result } = renderHook(() => useHeaderStyle());

    expect(result.current.headerStyle).toContain('bg-white/80');
    expect(result.current.isDarkText).toBe(true);
  });

  it('uses overlay mode while mobile menu is open', () => {
    document.body.innerHTML =
      '<div data-route-path="/"><div data-hero-sentinel="true" aria-hidden="true"></div></div>';
    setSentinelRect(0);

    const { result } = renderHook(() => useHeaderStyle());

    act(() => {
      result.current.openMenu();
    });

    expect(result.current.headerStyle).toContain('bg-white/80');
    expect(result.current.isDarkText).toBe(true);
  });
});
