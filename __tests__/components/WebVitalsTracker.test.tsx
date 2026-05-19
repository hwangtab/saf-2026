import { render, act } from '@testing-library/react';
import WebVitalsTracker from '../../components/common/WebVitalsTracker';
import { track } from '@vercel/analytics';

// web-vitals/attribution mock: 콜백과 옵션을 캡처해 수동으로 fire 가능하게
let capturedClsCallback: ((metric: any) => void) | null = null;
let capturedClsOpts: any = null;

jest.mock('web-vitals/attribution', () => ({
  onCLS: jest.fn((cb: any, opts?: any) => {
    capturedClsCallback = cb;
    capturedClsOpts = opts;
  }),
  onFCP: jest.fn(),
  onINP: jest.fn(),
  onLCP: jest.fn(),
  onTTFB: jest.fn(),
}));

jest.mock('@vercel/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('../../lib/path-rules', () => ({
  stripLocale: (p: string) => p.replace(/^\/(ko|en)/, '') || '/',
}));

const mockUsePathname = jest.fn(() => '/');
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

function makeClsMetric(value: number, delta: number, target?: string) {
  return {
    name: 'CLS',
    value,
    delta,
    rating: value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor',
    attribution: {
      largestShiftTarget: target,
      loadState: 'complete',
    },
  };
}

describe('WebVitalsTracker — CLS per-path 격리', () => {
  let mockGtag: jest.Mock;
  let visibilityHandlers: EventListener[];

  beforeEach(() => {
    jest.clearAllMocks();
    capturedClsCallback = null;
    capturedClsOpts = null;
    mockUsePathname.mockReturnValue('/');
    mockGtag = jest.fn();
    Object.defineProperty(window, 'gtag', { value: mockGtag, writable: true });
    visibilityHandlers = [];
    jest
      .spyOn(document, 'addEventListener')
      .mockImplementation((type: string, handler: EventListenerOrEventListenerObject) => {
        if (type === 'visibilitychange') visibilityHandlers.push(handler as EventListener);
      });
    jest.spyOn(document, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function fireVisibilityHidden() {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    visibilityHandlers.forEach((h) => h(new Event('visibilitychange')));
  }

  it('onCLS를 reportAllChanges: true 옵션으로 등록', () => {
    render(<WebVitalsTracker />);
    expect(capturedClsOpts).toEqual({ reportAllChanges: true });
  });

  it('CLS 없으면 이벤트 전송하지 않음', () => {
    render(<WebVitalsTracker />);
    fireVisibilityHidden();
    const clsCalls = (mockGtag.mock.calls as any[]).filter(
      (c) => c[1] === 'web_vitals' && c[2]?.metric_name === 'CLS'
    );
    expect(clsCalls).toHaveLength(0);
  });

  it('단일 페이지: visibilitychange 시 해당 path의 CLS flush', () => {
    mockUsePathname.mockReturnValue('/petition/oh-yoon');
    render(<WebVitalsTracker />);

    act(() => {
      capturedClsCallback!(makeClsMetric(0.3, 0.3, '#main-section'));
    });

    fireVisibilityHidden();

    const gaCall = (mockGtag.mock.calls as any[]).find(
      (c) => c[1] === 'web_vitals' && c[2]?.metric_name === 'CLS'
    );
    expect(gaCall).toBeTruthy();
    expect(gaCall![2].metric_value).toBeCloseTo(0.3);
    expect(gaCall![2].page_path).toBe('/petition/oh-yoon');
    expect(gaCall![2].metric_rating).toBe('poor');
    expect(gaCall![2].debug_target).toBe('#main-section');

    const trackCall = (track as jest.Mock).mock.calls.find(
      (c) => c[0] === 'web_vitals' && c[1]?.metric_name === 'CLS'
    );
    expect(trackCall![1].page_path).toBe('/petition/oh-yoon');
  });

  it('SPA nav A→B: A의 CLS는 navigation 시 flush, B는 visibilitychange 시 flush', () => {
    const { rerender } = render(<WebVitalsTracker />);

    // Path A에서 CLS 발생
    act(() => {
      capturedClsCallback!(makeClsMetric(0.5, 0.5, '#section-a'));
    });

    // A→B SPA navigation
    mockUsePathname.mockReturnValue('/artworks');
    act(() => {
      rerender(<WebVitalsTracker />);
    });

    // A의 CLS가 이미 flush 됐는지 확인
    const gaCallsAfterNav = (mockGtag.mock.calls as any[]).filter(
      (c) => c[1] === 'web_vitals' && c[2]?.metric_name === 'CLS'
    );
    expect(gaCallsAfterNav).toHaveLength(1);
    expect(gaCallsAfterNav[0][2].page_path).toBe('/');
    expect(gaCallsAfterNav[0][2].metric_value).toBeCloseTo(0.5);

    // B에서 CLS 발생 (web-vitals 전역값은 계속 누적: 0.5 → 0.7)
    act(() => {
      capturedClsCallback!(makeClsMetric(0.7, 0.2, '#section-b'));
    });

    fireVisibilityHidden();

    // B의 CLS = 0.7 - 0.5(baseline) = 0.2 로 flush
    const allGaCalls = (mockGtag.mock.calls as any[]).filter(
      (c) => c[1] === 'web_vitals' && c[2]?.metric_name === 'CLS'
    );
    expect(allGaCalls).toHaveLength(2);
    expect(allGaCalls[1][2].page_path).toBe('/artworks');
    expect(allGaCalls[1][2].metric_value).toBeCloseTo(0.2);
    expect(allGaCalls[1][2].metric_rating).toBe('needs-improvement');
  });

  it('SPA nav A→B→C: B에 CLS 없으면 B flush 건너뜀', () => {
    const { rerender } = render(<WebVitalsTracker />);

    // A에서 CLS
    act(() => {
      capturedClsCallback!(makeClsMetric(0.4, 0.4));
    });

    // A→B nav
    mockUsePathname.mockReturnValue('/b');
    act(() => {
      rerender(<WebVitalsTracker />);
    });

    // B→C nav (B에서 CLS 없음)
    mockUsePathname.mockReturnValue('/c');
    act(() => {
      rerender(<WebVitalsTracker />);
    });

    // C에서도 CLS 없이 page hidden
    fireVisibilityHidden();

    const allGaCalls = (mockGtag.mock.calls as any[]).filter(
      (c) => c[1] === 'web_vitals' && c[2]?.metric_name === 'CLS'
    );
    // A 1건만 flush
    expect(allGaCalls).toHaveLength(1);
    expect(allGaCalls[0][2].page_path).toBe('/');
    expect(allGaCalls[0][2].metric_value).toBeCloseTo(0.4);
  });

  it('동일 path 재렌더 시 중복 flush 없음', () => {
    const { rerender } = render(<WebVitalsTracker />);

    act(() => {
      capturedClsCallback!(makeClsMetric(0.15, 0.15));
    });

    // 동일 path로 재렌더
    act(() => {
      rerender(<WebVitalsTracker />);
    });

    const gaCallsBeforeHide = (mockGtag.mock.calls as any[]).filter(
      (c) => c[1] === 'web_vitals' && c[2]?.metric_name === 'CLS'
    );
    expect(gaCallsBeforeHide).toHaveLength(0); // navigation flush 없어야 함

    fireVisibilityHidden();

    const allGaCalls = (mockGtag.mock.calls as any[]).filter(
      (c) => c[1] === 'web_vitals' && c[2]?.metric_name === 'CLS'
    );
    expect(allGaCalls).toHaveLength(1);
    expect(allGaCalls[0][2].metric_value).toBeCloseTo(0.15);
  });

  it('locale prefix 제거: /ko/petition → /petition 으로 정규화', () => {
    mockUsePathname.mockReturnValue('/ko/petition/oh-yoon');
    render(<WebVitalsTracker />);

    act(() => {
      capturedClsCallback!(makeClsMetric(0.2, 0.2));
    });

    fireVisibilityHidden();

    const gaCall = (mockGtag.mock.calls as any[]).find(
      (c) => c[1] === 'web_vitals' && c[2]?.metric_name === 'CLS'
    );
    expect(gaCall![2].page_path).toBe('/petition/oh-yoon');
  });
});
