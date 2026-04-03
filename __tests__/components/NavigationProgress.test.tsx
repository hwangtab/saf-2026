import { act, render } from '@testing-library/react';
import NavigationProgress from '@/components/layout/NavigationProgress';

let mockPathname = '/admin';
let mockSearchParams = '';
let mockReducedMotion = false;

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe('NavigationProgress', () => {
  const rafCallbacks = new Map<number, FrameRequestCallback>();
  let nextRafId = 0;

  const flushAnimationFrame = () => {
    const pending = Array.from(rafCallbacks.entries());
    rafCallbacks.clear();

    pending.forEach(([, callback]) => {
      callback(16);
    });
  };

  beforeEach(() => {
    mockPathname = '/admin';
    mockSearchParams = '';
    mockReducedMotion = false;
    nextRafId = 0;
    rafCallbacks.clear();

    jest.useFakeTimers();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: mockReducedMotion,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        const id = ++nextRafId;
        rafCallbacks.set(id, callback);
        return id;
      });

    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function getBar(container: HTMLElement) {
    const bar = container.querySelector('[aria-hidden="true"] > div');

    if (!(bar instanceof HTMLDivElement)) {
      throw new Error('progress bar not found');
    }

    return bar;
  }

  it('cancels pending animation frames before a new cycle starts', () => {
    const { container, rerender } = render(<NavigationProgress />);
    const bar = getBar(container);

    act(() => {
      mockPathname = '/admin/users';
      rerender(<NavigationProgress />);
    });

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      mockSearchParams = 'page=2';
      rerender(<NavigationProgress />);
    });

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);

    act(() => {
      flushAnimationFrame();
    });

    expect(bar.style.width).toBe('0%');

    act(() => {
      flushAnimationFrame();
    });

    expect(bar.style.width).toBe('85%');
  });

  it('clears the previous hide timer when navigation restarts mid-animation', () => {
    const { container, rerender } = render(<NavigationProgress />);
    const bar = getBar(container);

    act(() => {
      mockPathname = '/admin/users';
      rerender(<NavigationProgress />);
    });

    act(() => {
      flushAnimationFrame();
    });

    act(() => {
      flushAnimationFrame();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(bar.style.width).toBe('100%');
    expect(bar.style.opacity).toBe('0');

    act(() => {
      mockSearchParams = 'tab=activity';
      rerender(<NavigationProgress />);
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(bar.style.display).toBe('block');
    expect(bar.style.width).toBe('100%');
    expect(bar.style.opacity).toBe('0');
  });

  it('skips scheduling animation when reduced motion is preferred', () => {
    mockReducedMotion = true;
    const { container, rerender } = render(<NavigationProgress />);
    const bar = getBar(container);

    act(() => {
      mockPathname = '/admin/logs';
      rerender(<NavigationProgress />);
    });

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    expect(bar.style.display).toBe('none');
    expect(bar.style.width).toBe('0%');
    expect(bar.style.opacity).toBe('0');
  });

  it('cleans up pending animation work on unmount', () => {
    const { rerender, unmount } = render(<NavigationProgress />);

    act(() => {
      mockPathname = '/admin/users';
      rerender(<NavigationProgress />);
    });

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);

    act(() => {
      unmount();
    });

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(rafCallbacks.size).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });
});
